import { Prisma } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";
import { RequestHandler } from "express";
import mongoose from "mongoose";
import prisma from "../db/prisma-client";
import Note, { INoteFile } from "../models/noteModel";
import cleanFiles from "../utils/cleanFiles";
import deleteFiles from "../utils/deleteFiles";

//filter regex
//https://attacomsian.com/blog/mongoose-like-regex
//https://stackoverflow.com/questions/43729199/how-i-can-use-like-operator-on-mongoose
//https://dev.to/itz_giddy/how-to-query-documents-in-mongodb-that-fall-within-a-specified-date-range-using-mongoose-and-node-524a
//https://stackoverflow.com/questions/11973304/mongodb-mongoose-querying-at-a-specific-date
/*-----------------------------------------------------------
 * GET NOTES
 ------------------------------------------------------------*/
interface SearchQuery {
  page: string;
  size: string;
  toDate: string;
  fromDate: string;
  search: string;
}

/**
 * @desc - Get all notes
 * @route - GET api/notes
 * @access - Private
 *
 */

const getAllNotes: RequestHandler<
  unknown,
  unknown,
  unknown,
  SearchQuery
> = async (req, res) => {
  // Get all notes from MongoDB

  interface User {
    _id: mongoose.Types.ObjectId;
  }

  const { id } = req.user!;
  /**----------------------------------
         * PAGINATION
  ------------------------------------*/

  //query string payload
  const page = parseInt(req.query.page) || 1; //current page no. / sent as string convert to number//page not sent use 1
  const size = parseInt(req.query.size) || 15; //items per page//if not sent from FE/ use default 15
  const { fromDate, toDate } = req.query;
  const searchTerm = req.query.search || ""; //will be a case insensitive match//empty string match all
  const skip = (page - 1) * size; //eg page = 5, it has already displayed 4 * 10//so skip prev items

  //date range
  //if from fromDate:true, fetch all records not older than fromDate || no lower limit i.e not older than midnight of January 1, 1970//from midnight
  const startDate = fromDate
    ? startOfDay(new Date(fromDate))
    : startOfDay(new Date(0));
  // if toDate:true, fetch all records older than toDate || no upper limit i.e current date////end of day//up to midnight of that day
  const endDate = toDate ? endOfDay(new Date(toDate)) : endOfDay(new Date());

  //format with date-fns or use: new Date(new Date(fromDate).setHours(0o0, 0o0, 0o0)), //start searching from the very beginning of our start date eg //=> Tue Sep 02 2014 00:00:00
  //new Date(new Date(toDate).setHours(23, 59, 59)), //up to but not beyond the last minute of our endDate /eg Tue Sep 02 2014 23:59:59.999
  //or use date-fns to add start of day & end of day

  /**
   
  //#######SUMMARY- findMany query options, aggregation, count, sorting/groupBy etc

  // count all records All records (_all) (can also count only fields that are not null)
  const userCount = await prisma.note.count({
    select: {
      _all: true, // Count all records
      //can also count only fields that are not null
      title: true, // Count all non-null field values//where title is not null
    },
  });
  //count also supports filtering (see all filtering options under findMany formal filters below)
  const postCount = await prisma.post.count({
    where: {
      authorId: 29, //filter by foreign key === primary key of user whom the notes belong to
      //title like %word%
      title: {
        contains: "word",
      },
    },
  });
  //count with relation
  //Count all User records with at least one published Post
  const result = await prisma.user.count({
    where: {
      post: {
        some: {
          published: true,
        },
      },
    },
  });

  //Aggregation, grouping, and summarizing
  //Prisma Client allows you to  aggregate number fields
  //if no user or all users age field is null, it returns { _avg: { age: null } }
  //returns the average age of all users
  const aggregations = await prisma.user.aggregate({
    //available number oprations,_avg  _min (min value), _max//(max value)
    _avg: {
      age: true,
    },
    //can also add filtering and ordering to return Ordered by age ascending, Where email contains prisma.io, Limited to the 10 users
    where: {
      email: {
        contains: "prisma.io",
      },
    },
    orderBy: {
      age: "asc",
    },
    take: 10,

    //can also count fields whose avg is given-> returns:   {_avg: { age: 7},  _count: { age: 9 }}
    _count: {
      age: true,
    },
  });

  //GROUPBY->similar to $group in mongoose
  //Prisma Client's groupBy  allows you to group records by one or more field values
  //eg: groups all users by the country field and returns the total number of profile views for each country:
  const groupUsers = await prisma.user.groupBy({
    by: ["country"],
    _sum: {
      profileViews: true,
    },
    //can also add filtering
    where: {
      email: {
        contains: "prisma.io",
      },
    },
    //can also use having to filter entire groups by an aggregate value such as the sum or average of a field, not individual records
    //having is similar to $project in mongoose aggregate
    having: {
      profileViews: {
        _avg: {
          gt: 100,
        },
      },
    },
    //cab also sort/order
    ///If you use skip and/or take with groupBy, you must also include orderBy in the query
    orderBy: {
      country: "desc",
    },
    skip: 2,
    take: 2,
  });

  //=====all findMany options===========
  //findMany returns User[] or empty list, []
  //#1. with distinct-> Prisma Client allows you to filter duplicate rows i.e return different/unique values
  //eg below: returns all fields for all User records with distinct name field values
  const result = await prisma.user.findMany({
    where: {},
    distinct: ["name"],
  });
  //often used with select to identify certain unique combinations of values in the rows of your table
  //eg below: returns distinct role field values (for example, ADMIN and USER):
  const distinctRoles = await prisma.user.findMany({
    distinct: ["role"],
    select: {
      role: true,
    },
  });
  //distinct with relation
  //relation schema. play has a 1-n relations with both player and game
  //below will return: [{score: 900,game: { name: 'Pacman' },player: { name: 'Bert Bobberton' }},{score: 400, game: { name: 'Pacman' }, player: { name: 'Nellie Bobberton' }}] i.e where playerId is unique, and where gameId is unique (grouped in an object)
  // const distinctScores = await prisma.play.findMany({
  //   distinct: ["playerId", "gameId"],
  //   orderBy: {
  //     score: "desc",
  //   },
  //   select: {
  //     score: true,
  //     game: {
  //       select: {
  //         name: true,
  //       },
  //     },
  //     player: {
  //       select: {
  //         name: true,
  //       },
  //     },
  //   },
  // });

  //#2. with relation count, i.e count a relation with findMany
  //include each user's post count in the results eg [{ id: 1,..otherFieds,  _count: { posts: 3 } }, ...]
  const usersWithCount = await prisma.user.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    //or with nested select
    // select: {
    //   _count: {
    //     select: { posts: true },
    //   },
    // },
    //or return multiple relation counts
    // select: {
    // _count: {
    //   select: {
    //     posts: true,
    //     recipes: true,
    //   },
    // },
    //or use where to filter the fields returned by the _count output type.
    //// Count all user posts with the title "Hello!"
    // select: {
    //   _count: {
    //     select: {
    //       posts: { where: { title: "Hello!" } },
    //     },
    //   },
    // },
    //or with deeply nested relations (posts->comments = 1-n, comments -> author = 1-1)
    // Count all user posts that have comments
    // whose author is named "Alice"
    // select: {
    //   _count: {
    //     select: {
    //       posts: {
    //         where: {
    //           comments: { some: { author: { is: { name: "Alice" } } } },
    //         },
    //       },
    //     },
    //   },
    // },
  });

  //#3. with Relation filters (all are used inside a relation field within a where clause, )
  //supported options:
  //some-> Returns all records where one or more ("some") related records match filtering criteria.
  // every; -> Returns all records where all ("every") related records match filtering criteria.
  // none; -> Returns all records where zero related records match filtering criteria.
  // is; -> Returns all records where related record matches filtering criteria
  // isNot -> Returns all records where related record matches filtering criteria
  //(a). Relation Filters on "-to-many" relations, either 1-n, or m-n (below is 1-n)
  const result = await prisma.user.findMany({
    where: {
      posts: {
        //No posts with more than 100 views
        none: {
          views: {
            gt: 100,
          },
        },
        //Filter on absence of "-to-many" records
        //return all users that have zero posts
        //none: {},
        //All posts have less than, or equal to 50 likes
        every: {
          published: true,
        },
        //at least one Post mentions Prisma
        some: {
          content: {
            contains: "Prisma",
          },
        },
        //Filter on presence of related records
        //returns all users with at least one post
        some: {},
      },
    },
    include: {
      posts: true,
    },
  });
  //(b). Relation Filters on "-to-one" relations , either 1-1, or n-1 (below is the inverse side of above, so n-1,)
  const result = await prisma.post.findMany({
    where: {
      user: {
        //all Post records where user's name is NOT "Bob"
        isNot: {
          name: "Bob",
        },
        //all Post records where user is older than 40
        is: {
          age: {
            gt: 40,
          },
        },
      },
      //Filter on absence of "-to-one" relations
      // returns all posts that don't have an user relation
      user: null, // or user: { }
    },
    include: {
      user: true,
    },
  });

  //#4. with normal filter conditions and operators
  //All supported:
  ///1. individual filter(filters on a field eg email: {not: "xg.com"}): equals,not, in, notIn;lt;lte;gt;gte;contains;search;mode;startsWith;endsWith; ////see docs under reference
  //2. grouped filters(groups condition): AND;OR;NOT; //works same as in mongoose/////see docs under reference
  const posts = await prisma.post.findMany({
    where: {
      content: null, //
      //content: { not: null } //is not null
      //Case-insensitive filtering, only for mongoDB, pg, others are case insensitive by default
      email: {
        endsWith: "prisma.io",
        mode: "insensitive", // Default value: default
      },
      //conditions
      AND: [{ content: { contains: "Prisma" } }, { ...others }], //each condition must return true
      //Filter on scalar lists / arrays
      //all supported: has,hasEvery,hasSome,isEmpty,isSet,equals /////see docs under concepts(Working with fields) + reference
      //scalar lists methods: set, push, unset
      tags: {
        has: "databases", //eg 2: equals: ['databases', 'typescript'], eg3: isEmpty: true,
      },

      ////Filter on composite types/embedded docs/array of objects->mongodb only
      //all supported: equals, is,isNot,isEmpty,every,some,none // see composite types in docs under concepts(composite types) + reference
      //Composite type methods: set, unset,update,upsert,push
      photos: {
        isEmpty: true,
      },

      //JSON filters
      //see docs under concepts(Working with fields) + reference
    },
  });

  //#5. sorting/orderBy ->eq to mongoose .sort({createdAt: 1})
  //orderBy sorts a list of records
  //(a) normal sorting
  // returns all User records sorted by email ascending
  const users = await prisma.user.findMany({
    //sort by a field
    orderBy: {
      email: "asc", //alt 'desc'
    },
    //or sort by set of fields
    // orderBy: [
    //   {
    //     role: "desc",
    //   },
    //   {
    //     name: "desc",
    //   },
    // ],
  });
  // (b) Sort by relation
  //You can also sort by properties of a relation.
  //For example, the following query sorts all posts by the author's email address:
  //must be 1-1 relation
  const posts = await prisma.post.findMany({
    orderBy: {
      author: {
        email: "asc",
      },
    },
  });

  // (c) sort a nested list of records
  //returns all User records sorted by email, and each user's posts sorted by title
  const user = await prisma.user.findMany({
    orderBy: {
      email: "asc", //alt 'desc'
    },

    //#see include and filtering under createNewNote for deeply nested relations
    include: {
      posts: {
        orderBy: {
          title: "desc",
        },
        //or order/sort by a relation
        //   orderBy: {
        // author: {
        //   email: "asc", 
        // },

        //can also add a where here to filter posts//where can have options like relation filters
        //        where: {
        // //         title: { contains: "omelette" },
        // //       },

        //or a where with relation filter
        // where: {
        //           comments: { some: { author: { is: { name: "Alice" } } } },
        //         },
        select: {
          title: true,
        },
      },
    },
  });

*/

  //# Actual implementation begins for fething paginated notes using Offset pagination
  //try Cursor-based pagination as well

  const filter: Prisma.NoteCountArgs = {
    where: {
      userId: id, //filter by foreign key === primary key of user whom the notes belong to
      //title like %word% and case insensitive
      title: {
        contains: searchTerm,
        mode: "insensitive",
      },
      updatedAt: {
        gte: startDate, //start searching from the very beginning of our start date
        lte: endDate, //up to but not beyond the last minute of our endDate
      },
    },
  };

  const total = await prisma.note.count(filter);

  //if total = 0 //error
  if (!total) {
    return res.status(400).json({ message: "No notes found" });
  }

  const pages = Math.ceil(total / size);

  //in case invalid page is sent//out of range//not from the pages sent
  if (page > pages) {
    return res.status(400).json({ message: "Page not found" });
  }

  const results = await prisma.note.findMany({
    where: {
      userId: id, //filter by foreign key === primary key of user whom the notes belong to
      //title like %word% and case insensitive
      title: {
        contains: searchTerm,
        mode: "insensitive",
      },
      updatedAt: {
        gte: startDate, //start searching from the very beginning of our start date
        lte: endDate, //up to but not beyond the last minute of our endDate
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    //select fields & include CATS
    select: {
      noteId: true,
      createdAt: true,
      updatedAt: true,
      title: true,
      content: true,
      deadline: true,
      files: true,
      //can add _count here->returns number of categories per note
      _count: {
        select: { categories: true },
      },
      categories: {
        // orderBy: {
        //   name: "desc",
        // },
        //can also add a where here
        //        where: {
        // //         title: { contains: "omelette" },//can include relation filters here as well
        // //       },
        select: {
          name: true,
        },
      },
    },

    skip,
    take: size, //limit in mongoose
  });

  res.status(200).json({
    pages,
    total,
    notes: results,
  });
};

/*-----------------------------------------------------------
 * GET NOTE
 ------------------------------------------------------------*/

/**
 * @desc - Get note
 * @route - GET api/notes/:id
 * @access - Private
 *
 */
const getNoteById: RequestHandler = async (req, res) => {
  // Get single note
  const { noteId } = req.params;

  const note = await prisma.note.findFirst({
    where: {
      noteId: parseInt(noteId),
    },

    //to select fields, no relations
    // select: {
    //   email: true,
    //   name: true,
    // },

    //include relations >see below all options under createNote
    include: {
      categories: true,
    },
  });

  // If note not found
  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  res.json(note);
};

/*-----------------------------------------------------------
 * CREATE NOTE
 ------------------------------------------------------------*/

interface CreateNoteBody {
  title?: string;
  content?: string;
  deadline?: string;
}

/**
 * @desc - Create new note
 * @route - POST api/notes
 * @access - Private
 *
 */

const createNewNote: RequestHandler<
  unknown,
  unknown,
  CreateNoteBody,
  unknown
> = async (req, res) => {
  const { title, content, deadline } = req.body;

  const { files, user } = req;

  //clean files
  const fileArr = cleanFiles(files as INoteFile[]);

  // Confirm data
  if (!title || !content || !deadline) {
    deleteFiles(fileArr); //clear failed req
    return res.status(400).json({ message: "All fields are required" });
  }

  // //==>saving a 1-1, 1-n relation, and m-n relation in a single query

  // const userNote = await prisma.user.create({
  //   data: {
  //     email: "alice@prisma.io",
  //     username: "alice",
  //     password: "",
  //     //save 1-1->user has one profile and vice versa
  //     profile: {
  //       create: {
  //         bio: "This is a sample bio",
  //         gender: "Male",
  //         address: "xx-4th street",
  //       },
  //     },

  //     //save 1-n & m-n, user has many notes (that can be connected to many categories & vice versa-> m-n), but each of these notes must belong to a single user
  //     notes: {
  //       //1. create 1 new note->using a nested create->then nest categories inside
  //       // create: { title: "Hello World", content: "Note content", categories: {create: {name: ""}} },
  //       //2. create multiple notes->using a nested create
  //       create: [
  //         {
  //           title: "How to make an omelette",
  //           content: "This is a sample content",
  //           deadline: "2020-01-01T00:00:00.000Z",
  //           categories: {
  //             //create 1 CAT->can also add many as an array-> note can have many CATS
  //             create: {
  //               name: "Time Table",
  //             },
  //           },
  //         },
  //         {
  //           title: "How to make an omelette",
  //           content: "This is a sample content",
  //           deadline: "2020-01-01T00:00:00.000Z",
  //           categories: {
  //             create: {
  //               name: "Easy cooking",
  //             },
  //           },
  //         },
  //       ],

  //       //or use a nested createMany but you won't be able to add a create inside createMany to add categories
  //       //NOTE:  It is not possible to nest an additional create or createMany inside createMany. So can't create categories, with create you can. use create with an array if you want to create multiple notes
  //       // createMany: {
  //       //   data: [{ title: "My first post" }, { title: "My second post" }],
  //       // },
  //     },
  //   },

  //     //##Include relations and select relation fields (can also filter & sort returned list)
  //   //include relations of relations (can't select users fields or notes fields, include and select can't be on same level)
  //   // Include notes
  //   include: {
  //     //all user fields will be returned
  //     notes: {
  //       // Include categories
  //       include: {
  //         categories: true,
  //       },
  //       //can also filter returned notes, returns notes whose title contains= "om.."
  //       where: {
  //         title: { contains: "omelette" },
  //       },
  //       //can also order returned notes
  //       orderBy: {
  //         title: "asc",
  //       },
  //       //can't add select here because of the include for categories-> include & select can't be on same level
  //       //     select: {
  //       //       gender: true,
  //       //       bio: true,
  //       //       address: true,
  //       //     },
  //     },
  //   },
  //   //or use nested select, with select fields and filters->best option if you need to select fields
  //   //   select: {
  //   //     //must add user fields here else only the relation fields will be returned
  //   //     notes: {
  //   //       //can filter & sort list of returned notes
  //   //       where: {
  //   //         title: { contains: "omelette" },
  //   //       },
  //   //       orderBy: {
  //   //         title: "asc",
  //   //       },
  //   //       select: {
  //   //         title: true,
  //   //         categories: {
  //   //         select: {
  //   //         name: true, //return categories names
  //   //       },
  //   //       },
  //   //     },
  //   //   },

  //          //or just include without filtering
  // include: {
  //   notes: {
  //     include: {
  //       categories: true,
  //     },
  //   },
  // },

  // or include only notes
  // include: {
  //   notes: true,
  // },
  //   // }
  // });

  //==>updating a 1-1, 1-n relation, and m-n relation in a single query
  //note: update query(not upsert) for 1-n or m-n must have a where inside, even nested updates

  // const userNote = await prisma.user.update({
  //   where: { email: "alice@prisma.io" },
  //   data: {
  // ..update user data here or profile 1-1 relation => see user controller

  //NOTE: since posts is an array 1-n, you must pass 'where'.
  //     posts: {

  ///     //update
  //update one note
  // update: {
  //     where: {
  //       id: 9,
  //     },
  //     data: {
  //can update CAT here to eg categories: {update: {where: {}, data: {}}}
  //       title: 'My updated title',
  //     },
  //   },
  //update many notes
  //       update: [  //omit array if updating one
  //         //update two specific notes//update must have a where for 1-n
  //         {
  //           where: { id: 32 },
  //           data: { title: "How to make an omelette" },
  //         },
  //         {
  //           data: { title: "How to make an omelette" },
  //           where: { id: 23 },
  //         },
  //       ],

  //       // //update many notes(any that matches)
  //       // updateMany: {
  //       // where: {
  //       //   published: true,
  //       // },
  //       // data: {
  //       //   published: false,
  //       // },

  //       //upsert
  //      //upsert multiple/ omit array if upsert-ing one note
  // upsert: [
  //       {
  //         create: { title: 'This is my first post' },
  //         update: { title: 'This is my first post' },
  //         where: { id: 32 },
  //       },
  //       {
  //         create: { title: 'This is mt second post' },
  //         update: { title: 'This is mt second post' },
  //         where: { id: 23 },
  //       },
  //     ],

  //       //delete
  //        delete specific notes with delete// rec
  //        //delete: [{ id: 34 }, { id: 36 }],

  //       //deleting specific notes with deleteMany
  //       // deleteMany: [{ id: 7 }],

  //       // delete many notes
  //         //deleteMany: {  published: false,},

  //       //delete all notes
  //       // deleteMany: {},

  //       //CREATE
  //TIP: create and createMany are available when creating a parent record or updating one
  //       // update user by creating new records
  //       //****You can nest create or createMany inside an update to add new related records to an existing record.
  //        // ***with createMany-> Does not support nesting additional relations - you cannot nest an additional create or createMany
  //       //NOTE, this follows the same rules like when creating a user using create(). See above
  //       //   eg1
  //       //   createMany: {
  //       //   data: [{ title: 'My first post' }, { title: 'My second post' }],
  //       // },
  //       //eg2 using create //or for multiple notes, pass an array to create: [{...note fields, categories: {     create: {..CAT fields}}, ..]
  //       //***with create->Create supports nesting additional relations
  //       create: {
  //       //   title: "Hello World",
  //       //   content: "Note content",
  //       //   categories: { create: { name: "" } },
  //       // },
  //     },
  //   },
  //   //include options -> see create above
  //   include: {
  //     notes: {
  //       include: {
  //         categories: true,
  //       },
  //     },
  //   },
  // });

  //connect
  //A nested connect query connects a record to an existing related record by specifying an ID or unique identifier.
  //you can create a new record $ connect it to existing record, connect an existing record to an existing record, or create a new record and try to connect it to an existing record and if it doesn't exist, create it.
  //it can work on either side of a relation(any relation) whichever side you want

  // eg1->create a record and connect to an existing record
  // Create a new Profile record and connect it to an existing User record via an ID field
  // const user = await prisma.profile.create({
  //   data: {
  //     bio: "Hello World",
  //     user: {
  //       connect: { id: 42 }, // sets userId of Profile record// id(User model id) is the reference inside  @relation of the Profile model
  //     },
  //   },
  // });
  // //eg2: connect an existing record to an existing record(s)
  // //#Update an existing User record by connecting it to two existing Post records
  // const user = await prisma.user.update({
  //   where: { email: "alice@prisma.io" },
  //   data: {
  //     posts: {
  //       connect: [{ id: 24 }, { id: 42 }], //or use connect: { id: 24 }, to connect to one post
  //     },
  //   },
  // });
  //eg3: Create a new Profile record, then connect it to an existing User record or create a new User if user with email given doesn't exist
  //   const user = await prisma.profile.create({
  //   data: {
  //     bio: 'The coolest Alice on the planet',
  //     user: {
  //       connectOrCreate: {
  //         where:  { email: 'alice@prisma.io' },
  //         create: { email: 'alice@prisma.io'}
  //     },
  //   },
  // })

  //===========OPTION 1->create note with CATS and connect===========
  //for m-n relation, it means, you can create a note and nest a create that will create multiple CATS connected to this note
  //vice verse will also work, both ways i.e nest a create inside category parent query
  //Don't use createMany as a top level query-> That is 'cause you cannot access relations in a createMany query
  //you can use create with Promise.all() to nest relations inside
  // this is the inverse side of 1-n, a note can only be connected to one user
  // create a note and connect it to a user
  const userNote = await prisma.note.create({
    data: {
      title,
      content,
      deadline: new Date(deadline),
      files: fileArr as Prisma.JsonArray,
      categories: {
        //create CAT->can also pass an array to create multiple CATS
        create: {
          name: "Time Table",
        },
      },
      // #connect created note to user
      // user is the annotated @relation field in the Note model
      // id is what is referenced inside @relation on Note model.
      user: {
        connect: { id: user?.id },
      },
    },
    include: {
      user: true,
    },
  });

  if (!userNote) {
    deleteFiles(fileArr); //clear failed req
    return res.status(400).json({ message: "Invalid note data received" });
  }

  //===========OPTION 2->update user by creating new note with CAT===========
  // const userNote = await prisma.user.update({
  //   where: { id: user?.id },
  //   data: {
  //     notes: {
  //       create: {
  //         title,
  //         content,
  //         deadline: new Date(deadline),
  //         files: fileArr as Prisma.JsonArray,
  //         categories: {
  //           create: [
  //             {
  //               name: "Easy cooking",
  //             },
  //             {
  //               name: "Budget recipe",
  //             },
  //           ],
  //         },
  //       },
  //     },
  //   },

  //   include: {
  //    //this returns all notes for this user and their categories
  //     notes: {
  //       include: {
  //         categories: true,
  //       },
  //     },
  //   },
  // });

  // if (!userNote) {
  //   deleteFiles(fileArr); //clear failed req
  //   return res.status(400).json({ message: "Invalid note data received" });
  // }

  // Created
  //return res.status(201).json({ message: "New note created" }); //201 is default
  return res.status(201).json(userNote);
};

/*-----------------------------------------------------------
 * UPDATE NOTE
 ------------------------------------------------------------*/
interface UpdateNoteParams {
  noteId: string;
}

interface UpdateNoteBody {
  title?: string;
  content?: string;
  deadline?: string;
}

/**
 * @desc - Update a note
 * @route - PATCH /notes/:id
 * @access - Private
 *
 */
const updateNote: RequestHandler<
  UpdateNoteParams,
  unknown,
  UpdateNoteBody,
  unknown
> = async (req, res) => {
  const { noteId } = req.params;
  const { title, content, deadline } = req.body;

  const { user, files } = req;

  //clean files
  const fileArr = cleanFiles(files as INoteFile[]);

  // Confirm data
  if (!title || !content || !deadline) {
    deleteFiles(fileArr); //clear failed req
    return res.status(400).json({ message: "All fields are required" });
  }

  //consider not using auto incremented numbers to allow db to be scalable eg max of Int = 2147483647, past that = error
  const note = await prisma.note.findFirst({
    where: {
      noteId: parseInt(noteId),
    },

    //add include/ select here if needed
  });

  if (!note) {
    deleteFiles(fileArr); //clear failed req
    return res.status(400).json({ message: "Note not found" });
  }
  //del prev files//if new files exist
  if (fileArr?.length) {
    deleteFiles(note.files as any); //as Prisma.JsonArray
  }

  note.title = title;
  note.content = content;
  note.deadline = new Date(deadline);
  fileArr?.length && (note.files = fileArr);

  //delete userId field returned above. Can't update a foreign key directly. See Referential actions

  const noteUpdateInput = {
    title: title ? title : undefined, // In Prisma Client, undefined means do nothing i.e do not include this in the update
    content,
    deadline: new Date(deadline),
    files: fileArr?.length ? fileArr : undefined, // In Prisma Client, undefined means do nothing i.e do not include this in the update
  };

  //option 1: update note directly-> See under createNote
  //Note,queries involving relations are nested writers i.e executed as a transaction. Eg the note has categories connected to it.
  //trying to update a category with an id that doesn't exist will fail the whole query(changes made are reverted) and will throw the error below:
  //await prisma.note.update(\nAn operation failed because it depends on one or more records that were required but not found. No 'Category' record was found for a nested update on relation 'CategoryToNote'.",
  const userNotes = await prisma.note.update({
    where: { noteId: parseInt(noteId) },
    data: {
      ...noteUpdateInput,
      categories: {
        update: {
          where: { id: 50 },
          data: { name: "Easy cooking1" },
        },
      },
    },
    include: {
      categories: true,
    },
  });

  //option 2: update notes while updating parent user record->nest update for notes and for categories-> see under createNote
  //===========OPTION 2->update user by updating one Note record connected to it + CATs===========
  //returns user, all user's notes(and their categories)
  // const userNotes = await prisma.user.update({
  //   where: { id: user?.id },
  //   data: {
  //     notes: {
  //       update: {
  //         where: { noteId: parseInt(noteId) },
  //         data: {
  //           ...noteUpdateInput,
  //           categories: {
  //             update: {
  //               where: { id: 50 },
  //               data: { name: "Easy cooking1" },
  //             },
  //           },
  //         },
  //       },
  //     },
  //   },

  //   include: {
  //     //this returns all notes for this user and their categories
  //     notes: {
  //       include: {
  //         categories: true,
  //       },
  //     },
  //   },
  // });

  res.json(userNotes);
};

/*-----------------------------------------------------------
 * DEL NOTE
 ------------------------------------------------------------*/

/**
 * @desc - Delete a note
 * @route - DELETE /notes/:id
 * @access - Private
 *
 */
const deleteNote: RequestHandler = async (req, res) => {
  const { noteId } = req.params;

  // Confirm note exists to delete
  const note = await prisma.note.findFirst({
    where: {
      noteId: parseInt(noteId),
    },

    //add include or select to include CATS
  });

  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  deleteFiles(note.files as any); //as Prisma.JsonArray

  //this is an implicit m-n relation. There is no @relation on either side so no onDelete referential action
  //delete manually: first delete related CATS and then delete note
  //update note by deleting it's cats
  const delCategories = await prisma.note.update({
    where: {
      noteId: parseInt(noteId),
    },
    data: {
      categories: {
        deleteMany: {},
      },
    },

    //add include or select to include CATS
  });

  //then delete note
  const result = await prisma.note.delete({
    where: {
      noteId: parseInt(noteId),
    },
  });

  res.json(result);
};

export { createNewNote, deleteNote, getAllNotes, getNoteById, updateNote };
