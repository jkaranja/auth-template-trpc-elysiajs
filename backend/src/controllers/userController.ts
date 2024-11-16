import crypto from "crypto";
import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";
import { removeImage } from "../utils/cloudnary";
import sendEmail from "../utils/sendEmail";

import { RequestHandler } from "express";
import mongoose from "mongoose";
import prisma from "../db/prisma-client";
import isValidUUID from "../utils/uuid";
import { Role } from "@prisma/client";

/*-----------------------------------------------------------
 * GET USER
 ------------------------------------------------------------*/

/**
 * @desc - Get user
 * @route - GET api/users
 * @access - Private
 *
 */
const getUser: RequestHandler = async (req, res) => {
  // Get current user details
  const { user } = req;
  // If no users
  if (!user) {
    return res
      .status(400)
      .json({ message: "Something isn't right. Please contact support" });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    profileUrl: user.profileUrl,
    phoneNumber: user.phoneNumber,
    newEmail: user.newEmail,
  });
};

/*-----------------------------------------------------------
 * REGISTER
 ------------------------------------------------------------*/

interface SignUpBody {
  username?: string;
  email?: string;
  password?: string;
}

/**
 * @desc - Create new user
 * @route - POST /api/users/register
 * @access - Public
 *
 */

const registerUser: RequestHandler<
  unknown,
  unknown,
  SignUpBody,
  unknown
> = async (req, res) => {
  const { username, password, email } = req.body;

  // Confirm data
  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for duplicate email
  //match both lowercase and uppercase to ensure no same email is added in diff cases
  const duplicate = await prisma.user.findFirst({
    where: {
      email: {
        //if no mode, just pass email: "x@email"
        equals: email,
        mode: "insensitive", //collation//for pg and mongoDB only//others(mysql etc) use case-insensitive collation by default
      },
    },
  });

  if (duplicate) {
    return res
      .status(409)
      .json({ message: "Account already exists. Please log in" });
  }

  // Hash password
  const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

  //gen verify token & hash it
  const verifyToken = crypto.randomBytes(10).toString("hex");
  const verifyEmailToken = crypto
    .createHash("sha256")
    .update(verifyToken)
    .digest("hex");

  //send verify token
  const emailOptions = {
    subject: "Please verify your email",
    to: email,
    body: `
                <p>Hi ${username}, </p>
                <p>Welcome to clientlance.io</p>
                <p>Please click the button below to confirm your email address:</p>             
                <a href ='${process.env.VERIFY_EMAIL_URL}/${verifyToken}' target='_blank' style='display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 15px 0px; padding: 5px 15px; text-transform: capitalize; border-color: #3498db;'>Confirm your email</a>  
                 
                <p>Thanks!</p>
                 <p>Clientlance team</p>
                             
                `,
  };
  //don't wait//they can resend if it fails
  sendEmail(emailOptions);

  ///save user
  const userData = {
    username,
    password: hashedPwd,
    email,
    verifyEmailToken,
    roles: [Role.ADMIN], //import generated enum by prisma client, for types use Prisma.Type namespace
  };

  //non-nested write/no relation
  //returns created record or null
  // const created = await prisma.user.create({
  //   data: userData,
  // select: {
  //   email: true,
  //   ...
  // }//add select or leave it to return all fields
  // });

  //saving a 1-1 relation
  // Nested writes:
  // A nested write allows you to write relational data to your database in a single transaction.
  //Nested writes provides transactional guarantees for creating, updating or deleting data across multiple tables in a single Prisma Client query. If any part of the query fails (for example, creating a user succeeds but creating posts fails), Prisma Client rolls back all changes.
  //A write query with relation, select(user fields + relation/profile fields)
  const created = await prisma.user.create({
    data: {
      ...userData,
      //Atomic number operations, inc + dec
      //eg
      //rating: { increment: 1 }, //adds n to current rating
      // rating: { increment: 1 }, //Subtracts n from current rating
      // rating: { multiply: 1 }, //multiply current by n
      // rating: { Divide: 1 }, //Divides current by n to
      // rating: { set: 1 }, //Sets the current field value. Identical to { myField : n }.

      //relation
      profile: {
        create: {
          bio: "This is a sample bio",
          gender: "Male",
          address: "xx-4th street",
        }, //pass an array instead to create multiple eg  for 1-n
      },
    },

    //Select Fields: #Include relations and select relation fields
    //relations are not returned by default->either use nested select or include(with select inside).
    //1.using nested select(to include relation.)//disAdv: must also pass user fields to return else none
    select: {
      id: true,
      username: true,
      email: true,
      profileUrl: true,
      profile: {
        select: {
          gender: true,
          bio: true,
          address: true,
        },
      },
    },
    //2.using select within an include(disAdv: returns all user fields, can't use both select and include without nesting i.e cannot use select and include on the same level )
    // Returns all user fields
    // include: {
    //   profile: {
    //     select: {
    //       gender: true,
    //       bio: true,
    //       address: true,
    //     },
    //   },
    // },
    //3. include profile without selecting any field->all user fields & all profile fields.Note: can't use both select and include on the same  to then select user fields
    // include: {
    //   profile: true,
    // },
  });

  if (!created) {
    return res.status(400).json({ message: "Check details and try again" });
  }

  //create a token that will be sent back as cookie//for resending email
  const resendEmailToken = jwt.sign(
    { id: created.id, email },
    process.env.RESEND_EMAIL_TOKEN_SECRET,
    { expiresIn: "15m" } //expires in 15 min
  );

  // Create secure cookie with user id in token
  res.cookie("resend", resendEmailToken, {
    httpOnly: false, //readable for displaying email
    secure: true,
    sameSite: "none", //
    maxAge: 15 * 60 * 1000, //expire in 15 min
  });

  res.status(201).json({ message: "Registered successfully" });
};

/*-----------------------------------------------------------
 * RESEND EMAIL
 ------------------------------------------------------------*/

/**
 * @desc - Resend email token
 * @route - POST api/users/resend/email
 * @access - Public
 *
 */
const resendVerifyEmail: RequestHandler = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.resend) {
    return res.status(400).json({ message: "Email could not be sent" });
  }

  const resendEmailToken: string = cookies.resend; //cookies.jwt is of any type//must be converted to string for err & decoded types to be inferred
  //else you must pass type: err: VerifyErrors | null,  decoded: JwtPayload | string | undefined

  jwt.verify(
    resendEmailToken,
    process.env.RESEND_EMAIL_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) {
        return res.status(400).json({ message: "Email could not be sent" });
      }
      const { id } = <{ id: string }>decoded;

      // By ID (field must be @id or @unique)
      const foundUser = await prisma.user.findUnique({
        where: {
          id,
        },
      });

      if (!foundUser) {
        return res.status(400).json({ message: "Email could not be sent" });
      }
      //now resend email with new verify token
      //gen verify token
      const verifyToken = crypto.randomBytes(10).toString("hex");
      const verifyEmailToken = crypto
        .createHash("sha256")
        .update(verifyToken)
        .digest("hex");

      //resend email
      const emailOptions = {
        subject: "Please verify your email",
        to: foundUser.email,
        body: `
                <p>Hi ${foundUser.username}, </p>
                <p>Welcome to clientlance.io</p>
                <p>Please click the button below to confirm your email address:</p>             
                <a href ='${process.env.VERIFY_EMAIL_URL}/${verifyToken}' target='_blank' style='display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 15px 0px; padding: 5px 15px; text-transform: capitalize; border-color: #3498db;'>Confirm your email</a>  
                 
                <p>Thanks!</p>
                 <p>Clientlance team</p>
                             
                `,
      };
      //don't wait//they can resend if it fails
      sendEmail(emailOptions);

      //update verify token
      await prisma.user.update({
        where: { id },
        data: { verifyEmailToken }, //not data object must have at least one property to update. If value of the field is undefined, it is the same as not including it i.e it won;t be changed
      });

      res.json({ message: "Email sent" });
    }
  );
};

/*-----------------------------------------------------------
 * UPDATE/PATCH
 ------------------------------------------------------------*/
//ALLOW USERS TO CHANGE EMAIL BUT DON'T USE EMAIL AS UNIQUE IDENTIFY IN OTHER COLLECTION//USE user: object id //the can populate
//so you will only need to update email in user collection only//id remains the same

/**
 * @desc - Update user
 * @route - PATCH api/users/:id
 * @access - Private
 *
 */
const updateUser: RequestHandler = async (req, res) => {
  const { username, email, phoneNumber, password, newPassword } = req.body;

  const profileUrl = req.file?.path;
  const publicId = req.file?.filename;

  const { id } = req.params;

  //check if id is a valid uuid
  if (!isValidUUID(id)) {
    await removeImage(publicId);
    return res.status(400).json({ message: "User not found" });
  }

  // Does the user exist to update//exists since we are already here
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    await removeImage(publicId);
    return res.status(400).json({ message: "User not found" });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    await removeImage(publicId);
    return res.status(400).json({ message: "Wrong password" });
  }

  // update user
  if (newPassword) user.password = await bcrypt.hash(newPassword, 10);
  if (username) user.username = username;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  //upload and store public id
  if (profileUrl) user.profileUrl = profileUrl;
  //email changed
  if (email && user.email !== email) {
    //gen verify token & hash it
    const verifyToken = crypto.randomBytes(10).toString("hex");
    const verifyEmailToken = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    // Check for duplicate email//case insensitive
    const duplicate = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    // Allow only updates to the original user
    if (duplicate) {
      await removeImage(publicId);
      return res.status(409).json({ message: "Duplicate email" });
    }

    //update new email and token
    user.newEmail = email;
    user.verifyEmailToken = verifyEmailToken;

    //send un hashed token
    const emailOptions = {
      subject: "Please verify your email",
      to: email,
      body: `
                <p>Hi ${user.username}, </p>
                <p>Complete changing your email address by confirming it below:</p> 
                <a href ='${process.env.VERIFY_EMAIL_URL}/${verifyToken}' target='_blank' style='display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 15px 0px; padding: 5px 15px; text-transform: capitalize; border-color: #3498db;'>Confirm your email</a> 
                <p>If you didn't initiate this request, please disregard this email</p>
                <p>Thanks!</p>
                <p>Clientlance team</p>
                             
                `,
    };
    //wait for fail or success//can't resend email
    const response = await sendEmail(emailOptions);
    if (!response) {
      await removeImage(publicId);
      return res.status(400).json({
        message: "Account could not be updated. Please try again",
      });
    }
  }

  //updating a 1-1 relationship
  //note that the rules for onUpdate in Profile model will also affect what happens to profile record. We are using cascade, so if id of User is updated, so will the userId/foreign key/relation scalar field
  const updatedUser = await prisma.user.update({
    where: {
      id,
    },
    data: {
      ...user, //user won't contain a relation

      profile: {
        //option 1
        update: { bio: "This is a new sample bio" },
        //or make update an upsert
        //option 2
        // upsert: {
        //   //ensure you include all required fields in create object below
        //   create: { bio: "Hello World", gender: "Male", address: "xx-y-z-20" },
        //   update: { bio: "Hello World" },
        // },
        //option 3
        //can also update user by deleting their profile
        // delete: true,
      },
    },
    //or use nested select
    select: {
      id: true,
      username: true,
      email: true,
      profileUrl: true,
      phoneNumber: true,
      newEmail: true,
      profile: {
        select: {
          bio: true,
          gender: true,
          address: true,
        },
      },
    },
    ////or just add to return all user & profile fields
    // include: {
    //   profile: true,
    // },
  });

  if (!updatedUser) {
    await removeImage(publicId);
    return res.status(400).json({
      message: "Account could not be updated. Please try again",
    });
  }

  //res =  updated user details
  return res.json(updatedUser);
};

/**
 * @desc - Delete a user
 * @route - DELETE api/users/:id
 * @access - Private
 *
 */
const deleteUser: RequestHandler = async (req, res) => {
  const { id } = req.params;

  //check if id is a valid uuid
  if (!isValidUUID(id)) {
    return res.status(400).json({ message: "User not found" });
  }

  // Does the user exist to delete?
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  //deleting 1-1 relation->this will follow the onDelete, onUpdate rules described in the Profile model

  // We are using cascade, so if we delete user, so will the profile
  //if we used Restrict, we wouldn't be able to delete user if profile exists
  //returns deleted doc or throws an exception if record does not exist.

  await prisma.user.delete({
    where: { id },
    //can also select returned fields
    select: {
      email: true,
      username: true,
    },
  });

  //to delete the profile without deleting user,
  // const user = await prisma.user.update({
  //   where: { email: "alice@prisma.io" },
  //   data: {
  //     profile: {
  //       delete: true,
  //     },
  //   },
  // });

  //clear refresh token cookie
  res.clearCookie("jwt", { httpOnly: true, sameSite: "none", secure: true });

  //204 don't have a response body
  //res.status(204).json({ message: "Account deactivated" }); //on frontend, success = clear state and redirect to home
  res.json({ message: "Account deactivated" }); //on frontend, success = clear state and redirect to home
};

export { getUser, registerUser, updateUser, deleteUser, resendVerifyEmail };
