const express = require("express");
const mongoose = require("mongoose");
const Response = require("./models/Response")
const User = require("./models/User");
const connectDB = require("./connect");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
app.use(cors());
app.use(express.json());
require('dotenv').config()

const isAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req && req.cookies) {
      token = req.cookies["jwt"];
    }
    const verified = jwt.verify(token, "SECRET_KEY");

    if (verified) {
      const user = await User.findOne({ _id: verified.id }).populate(
        "responses"
      );
      req.user = user;
      next();
    } else {
      return res.status(401).json({ data: "Unauthorized" });
    }
  } catch (err) {
    return res.status(401).json({ data: "Unauthorized" });
  }
};
const createUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.create([req.body], { session });

    const token = jwt.sign(JSON.stringify({ id: user._id }), "SECRET_KEY");

    await session.commitTransaction();
    session.endSession();

    res
      .cookie("jwt", token, {
        expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      })
      .status(201)
      .json({ data: user[0] });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      console.error("Error aborting transaction:", abortError);
    } finally {
      session.endSession();
    }
    res.status(500).json({ data: "Error creating user" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email }).populate(
      "responses"
    );
    if (!user) {
      return res.status(404).json({ data: "User Does not exist" });
    }
    try {
      await user.comparePassword(password);

      const token = jwt.sign(JSON.stringify({ id: user._id }), "SECRET_KEY");

      return res
        .cookie("jwt", token, {
          expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          httpOnly: true,
        })
        .status(200)
        .json({ data: user });
    } catch (err) {
      return res.status(400).json({ data: "Wrong password" });
    }
  } catch (err) {
    return res.status(500).json({ data: "Internal Server Error" });
  }
};

app.post("/auth/signin", loginUser);
app.post("/auth/signup", createUser);
app.use("/check", isAuth, (req, res) => {
  try {
    return res.status(200).send({ data: req.user });
  } catch (err) {
    return res.status(401).send({ data: "Unauthorized" });
  }
});

app.get("/responses/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findOne({ _id: userId }).populate(
      "responses"
    );
    if (!user) {
      return res.status(404).json({ data: "User Does not exist" });
    }
    return res.status(200).send({ data: user.responses });
  } catch (err) {
    return res.status(500).send({ data: "Internal Server Error" });
  }
});
app.get("/auth/logout", async (req, res) => {
  res
    .cookie("jwt", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .sendStatus(200);
});
app.post("/saveResponse/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findOne({ _id: userId });

    const newResponse = await Response.create(req.body); // Assume req.body contains the response data


    user.responses.push(newResponse._id); // Add the ObjectId reference to the user
    await user.save();
    return res.status(200).send({ data: newResponse });
  } catch (err) {
    console.log(err);

    return res.status(500).send({ data: "Internal Server Error" });
  }
});

app.get('/response',async(req,res)=>{
  try{
    const data = {
      "summary": "this is the summary",
      "result_text": "this is the result",
      "result_table_path": "string",
      "result_visualization_path": "string",
      "error": "string"
    }
    res.status(200).send({data:data})
  }
  catch(err){
    res.status(500).send({data:"Internal Server Error"})
  }
})

const start = async () => {
  try {
    await connectDB(
      process.env.MONGO_URI
    );
    console.log("Connected to Database...");
    app.listen(8080, () => {
      console.log(`Server is listening on port 8080`);
    });
  } catch (err) {
    console.log(err);
  }
};

start();
