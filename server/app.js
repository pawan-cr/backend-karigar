const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const AdminRoutes = require("./routes/adminRoutes");
const BusinessRoutes = require("./routes/businessRoutes");
const UserRoutes = require("./routes/userRoutes");
const twilioRoutes = require("./routes/twilio.routes");
const searchRoutes = require("./search/searchRoutes");

// const userRoutes = require("./routes/user.routes");
// const businessRoutes = require("./routes/business.routes");
// const verificationRoutes = require("./routes/verification.routes");
// const reviewRoutes = require("./routes/review.routes");
// const favouriteRoutes = require("./routes/favourite.routes");
// const recentRoutes = require("./routes/recent.routes");
// const categoryRoutes = require("./routes/category.routes");
// const reportRoutes = require("./routes/report.routes");
// const analyticsRoutes = require("./routes/analytics.routes");
// const notificationRoutes = require("./routes/notification.routes");
// const bannerRoutes = require("./routes/banner.routes");
// const cityRoutes = require("./routes/cities.routes");

app.use(
  cors({
    origin: [
      "https://finalist-anaconda-majestic.ngrok-free.dev",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// app.use("/api/auth", authRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/business", businessRoutes);
// app.use("/api/verification", verificationRoutes);
// app.use("/api/reviews", reviewRoutes);
// app.use("/api/favourites", favouriteRoutes);
// app.use("/api/recent-views", recentRoutes);
// app.use("/api/categories", categoryRoutes);
// app.use("/api/reports", reportRoutes);
// app.use("/api/analytics", analyticsRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api/banners", bannerRoutes);
// app.use("/api/cities", cityRoutes);

app.use("/api/auth", authRoutes);
app.use("/api", searchRoutes);
app.use("/api/admin", AdminRoutes);
app.use("/api/twilio", twilioRoutes);
app.use("/api", BusinessRoutes);
app.use("/api", UserRoutes);
module.exports = app;
