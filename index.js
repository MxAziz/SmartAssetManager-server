require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
// const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: ["http://localhost:5173", "https://sam000.web.app"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hathz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const userCollection = client.db("samDB").collection("users");
    const employeeCollection = client.db("samDB").collection("employees");
    const companyCollection = client.db("samDB").collection("companies");
    const paymentCollection = client.db("samDB").collection("payments");
    const productCollection = client.db("samDB").collection("products");
    const requestCollection = client.db("samDB").collection("requestProducts");

    // user related apis

    app.get("/users", async (req, res) => {
      try {
        const result = await userCollection
          .find({ role: "employee", companyId: { $exists: false } })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne({
        ...user,
        timeStamp: Date.now(),
      });
      res.send(result);
    });

    // product related apis
    app.get("/products", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

   app.get("/assets", async (req, res) => {
     try {
       const assets = await productCollection.find().toArray();
       res.status(200).json(assets);
     } catch (error) {
       res.status(500).json({ error: "Failed to fetch assets" });
     }
   });

    // app.get("/requestAsset/:email", async (req, res) => {
    //   const { email } = req.params;

    //   try {
    //     const assets = await productCollection.find({
    //       $or: [
    //         { employeeEmail: email }, // Match email
    //         { employeeEmail: { $exists: false } }, // Include missing field
    //       ],
    //     }).toArray();

    //     if (assets.length === 0) {
    //       return res
    //         .status(404)
    //         .json({ message: "No assets found for this email" });
    //     }
    //     res.status(200).json(assets);
    //   } catch (error) {
    //     res.status(500).json({ error: "Internal Server Error" });
    //   }
    // });

    app.get("/products/:email", async (req, res) => {
      const email = req.params.email;
      const query = {employeeEmail: email}
       const products = await requestCollection.find(query).toArray();
       res.send(products);
     });

    app.get("/requestAsset/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const assets = await requestCollection.aggregate([
          {
            $addFields: {
              employeeEmail: { $ifNull: ["$employeeEmail", "unknown"] },
            },
          },
          {
            $match: { employeeEmail: email },
          },
        ]).toArray();

        res.status(200).json(assets);
      } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    });




    // app.patch("/api/assets/:id", async (req, res) => {
    //   const { id } = req.params;
    //   const { status } = req.body;

    //   try {
    //     const update = { $set: { status } };

    //     // Increment product quantity if returned
    //     if (status === "Returned") {
    //       update.$inc = { productQuantity: 1 };
    //     }

    //     const result = await productCollection.updateOne(
    //       { _id: ObjectId(id) },
    //       update
    //     );

    //     if (result.modifiedCount > 0) {
    //       res
    //         .status(200)
    //         .json({ message: "Asset status updated successfully" });
    //     } else {
    //       res.status(404).json({ error: "Asset not found" });
    //     }
    //   } catch (error) {
    //     console.error("Error updating asset status:", error);
    //     res.status(500).json({ error: "Failed to update asset status" });
    //   }
    // });

    // app.patch("/assets/:id", async (req, res) => {
    //   const { id } = req.params;
    //   const { status } = req.body;

    //   const update = { $set: { status } };
    //   if (status === "Returned") update.$inc = { productQuantity: 1 };

    //  const result= await productCollection.updateOne({ _id: ObjectId(id) }, update);
    //   res.send(result);
    // });




   app.post("/requestProducts", async (req, res) => {
     try {
       const {
         assetId,
         assetName,
         requestDate,
         requestStatus,
         employeeName,
         employeeEmail,
         notes,
       } = req.body;

       const newRequest = {
         assetId,
         assetName,
         requestDate,
         requestStatus,
         employeeName,
         employeeEmail,
         notes,
       };

       const result = await requestCollection.insertOne(newRequest);
       res.status(201).json({ insertedId: result.insertedId });
     } catch (error) {
       res.status(500).json({ error: "Failed to submit asset request" });
     }
   });


    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });


    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          productName: updatedProduct.productName,
          type: updatedProduct.type,
          productQuantity: updatedProduct.productQuantity,
        },
      };

      const result = await productCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;

      if (!price) {
        return res.status(400).send({ error: "Price is required." });
      }

      const amount = price * 100; // Stripe accepts amount in cents
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).send({ error: "Payment Intent Failed" });
      }
    });

    // Save Payment Data
    app.post("/payments", async (req, res) => {
      const payment = req.body;

      try {
        const result = await paymentCollection.insertOne(payment);
        res.send({ paymentResult: result });
      } catch (error) {
        console.error("Payment Saving Error:", error);
        res.status(500).send({ error: "Failed to Save Payment" });
      }
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("SmartAssetManager server is running");
});

app.listen(port, () => {
  console.log(`SmartAssetManager server is running on port ${port}`);
});