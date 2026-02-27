import app from "./app.js";
import { startExpireBookingsJob } from "./jobs/expireBookings.job.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  startExpireBookingsJob();
});
