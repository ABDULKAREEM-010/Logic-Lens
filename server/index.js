const express = require("express");
const app = express();
const analyzeRoute = require("./routes/analyze");
const feedbackRoute = require('./routes/feedback');
const dashboardStats = require('./routes/dashboardStats');
const cors = require("cors");
require("dotenv").config();



app.use(cors());
app.use(express.json());

app.use('/api/rejections', require('./routes/rejections'));
app.use("/api/analyze", analyzeRoute);
app.use("/api/feedback", feedbackRoute); // /api/feedback and /api/feedback/all
app.use("/api/stats", dashboardStats);   // optional dashboard stats route

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
