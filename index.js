require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
// const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const userCollection = client.db("samDB").collection("users");
    const employeeCollection = client.db("samDB").collection("employees");
    const companyCollection = client.db("samDB").collection("companies");
    const paymentCollection = client.db("samDB").collection("payments");
    const productCollection = client.db("samDB").collection("products");

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

    // TODO:


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