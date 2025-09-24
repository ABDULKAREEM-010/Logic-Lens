// server/index.js
const express = require("express");
const app = express();
const cors = require("cors");

const analyzeRoute = require("./routes/analyze");
const feedbackRoute = require("./routes/feedback");
const dashboardStats = require("./routes/dashboardStats");

require("dotenv").config();

app.use(cors());
app.use(express.json());

app.use("/api/rejections", require("./routes/rejections"));
app.use("/api/github", require("./routes/github"));
app.use("/api/analyze", analyzeRoute);
app.use("/api/feedback", feedbackRoute);
app.use("/api/stats", dashboardStats); // optional

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
