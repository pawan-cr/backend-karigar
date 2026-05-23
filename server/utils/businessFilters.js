const City = require("../api/cities/citiesModel");

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const normalized = timeStr.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const isBusinessOpenNow = (timing = [], timezoneOffsetMinutes = 330) => {
  if (!timing.length) return false;
  const now = new Date();
  const localMs =
    now.getTime() + (timezoneOffsetMinutes - now.getTimezoneOffset()) * 60000;
  const local = new Date(localMs);
  const dayName = DAY_NAMES[local.getUTCDay()];
  const currentMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();

  const today = timing.find(
    (slot) => slot.day && slot.day.toLowerCase() === dayName,
  );
  if (!today || !today.open || !today.close) return false;

  const openMinutes = parseTimeToMinutes(today.open);
  const closeMinutes = parseTimeToMinutes(today.close);
  if (openMinutes === null || closeMinutes === null) return false;

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const resolveCityFilter = async (city, cityId) => {
  if (cityId) {
    const cityDoc = await City.findById(cityId);
    if (cityDoc) return new RegExp(cityDoc.name, "i");
  }
  if (city) return new RegExp(city, "i");
  return null;
};

module.exports = {
  isBusinessOpenNow,
  haversineKm,
  resolveCityFilter,
  DAY_NAMES,
};
