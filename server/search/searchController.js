const {
  searchUsers,
  searchBusinesses,
  searchCategories,
  searchSubCategories,
  searchCities,
  searchReports,
  searchVerifications,
  searchReviews,
} = require("./searchService");
const { logAdminActivity } = require("../api/adminActivity/adminActivityController");

const DEFAULT_ADMIN_INCLUDES = [
  "users",
  "businesses",
  "categories",
  "subCategories",
  "cities",
  "reports",
  "verifications",
];

function resultData(result) {
  return result.data;
}

function resultPagination(result) {
  return {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  };
}

function buildIncludeSet(include) {
  const rawInclude = include || DEFAULT_ADMIN_INCLUDES.join(",");
  return new Set(
    String(rawInclude)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

const adminSearch = async (req, res) => {
  try {
    const { q = "", include, page = 1, limit = 10 } = req.body || {};
    const query = String(q).trim();

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const includeSet = buildIncludeSet(include);
    const results = {};
    const pagination = {};
    const tasks = [];

    if (includeSet.has("users")) {
      tasks.push(
        searchUsers(query, page, limit).then((result) => {
          results.users = resultData(result);
          pagination.users = resultPagination(result);
        }),
      );
    }

    if (includeSet.has("businesses")) {
      tasks.push(
        searchBusinesses(query, {}, page, limit, { includeBlocked: true }).then(
          (result) => {
            results.businesses = resultData(result);
            pagination.businesses = resultPagination(result);
          },
        ),
      );
    }

    if (includeSet.has("categories")) {
      tasks.push(
        searchCategories(query, page, limit).then((result) => {
          results.categories = resultData(result);
          pagination.categories = resultPagination(result);
        }),
      );
    }

    if (includeSet.has("subCategories") || includeSet.has("subcategories")) {
      tasks.push(
        searchSubCategories(query, page, limit).then((result) => {
          results.subCategories = resultData(result);
          pagination.subCategories = resultPagination(result);
        }),
      );
    }

    if (includeSet.has("cities")) {
      tasks.push(
        searchCities(query, page, limit).then((result) => {
          results.cities = resultData(result);
          pagination.cities = resultPagination(result);
        }),
      );
    }

    if (includeSet.has("reports")) {
      tasks.push(
        searchReports(query, page, limit).then((result) => {
          results.reports = resultData(result);
          pagination.reports = resultPagination(result);
        }),
      );
    }

    if (includeSet.has("verifications")) {
      tasks.push(
        searchVerifications(query, page, limit).then((result) => {
          results.verifications = resultData(result);
          pagination.verifications = resultPagination(result);
        }),
      );
    }

    await Promise.all(tasks);

    await logAdminActivity(req, {
      action: "global_search",
      resource: "search",
      details: {
        q: query,
        include: Array.from(includeSet),
        page: Number(page),
        limit: Number(limit),
      },
    });

    return res.status(200).json({ query, results, pagination });
  } catch (error) {
    console.error("[adminSearch]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const userSearch = async (req, res) => {
  try {
    const {
      q = "",
      city,
      category,
      rating,
      page = 1,
      limit = 10,
    } = req.body || {};
    const query = String(q).trim();

    const [businesses, categories, cities] = await Promise.all([
      searchBusinesses(query, { city, category, rating }, page, limit, {
        includeBlocked: false,
      }),
      searchCategories(query, page, limit),
      searchCities(query, page, limit),
    ]);

    return res.status(200).json({
      query,
      results: {
        businesses: resultData(businesses),
        categories: resultData(categories),
        cities: resultData(cities),
      },
      pagination: {
        businesses: resultPagination(businesses),
        categories: resultPagination(categories),
        cities: resultPagination(cities),
      },
    });
  } catch (error) {
    console.error("[userSearch]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const ownerSearch = async (req, res) => {
  try {
    const { q = "", rating, page = 1, limit = 10 } = req.body || {};
    const query = String(q).trim();
    const ownerId = req.dbUser?._id || req.user?._id || req.user?.userId;

    const [reviews, verifications] = await Promise.all([
      searchReviews(query, ownerId, page, limit, { rating }),
      searchVerifications(query, page, limit, { ownerId }),
    ]);

    return res.status(200).json({
      query,
      results: {
        reviews: resultData(reviews),
        verifications: resultData(verifications),
      },
      pagination: {
        reviews: resultPagination(reviews),
        verifications: resultPagination(verifications),
      },
    });
  } catch (error) {
    console.error("[ownerSearch]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  adminSearch,
  userSearch,
  ownerSearch,
};
