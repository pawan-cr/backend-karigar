const mongoose = require("mongoose");
const User = require("../api/user/userModel");
const Business = require("../api/business/businessModel");
const Category = require("../api/category/categoryModel");
const SubCategory = require("../api/subCategory/subCategoryModel");
const City = require("../api/cities/citiesModel");
const Report = require("../api/reports/reportModel");
const Verification = require("../api/verification/verificationModel");
const { Review } = require("../api/review/reviewModel");

const SEARCH_TIMEOUT_MS = 200;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeQuery(q) {
  return typeof q === "string" ? q.trim() : "";
}

function normalizePagination(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);
  const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : DEFAULT_PAGE;
  const safeLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

function emptyResult(page, limit) {
  const pagination = normalizePagination(page, limit);
  return {
    data: [],
    total: 0,
    page: pagination.page,
    totalPages: 0,
  };
}

function buildTextQuery(q, fields = []) {
  const query = normalizeQuery(q);

  if (!query) {
    return {
      query,
      filter: {},
      projection: {},
      sort: { createdAt: -1 },
      isTextSearch: false,
    };
  }

  if (query.length <= 2) {
    const regex = { $regex: escapeRegExp(query), $options: "i" };
    return {
      query,
      filter: fields.length ? { $or: fields.map((field) => ({ [field]: regex })) } : {},
      projection: {},
      sort: { createdAt: -1 },
      isTextSearch: false,
    };
  }

  return {
    query,
    filter: { $text: { $search: query } },
    projection: { score: { $meta: "textScore" } },
    sort: { score: { $meta: "textScore" }, createdAt: -1 },
    isTextSearch: true,
  };
}

async function paginate(query, countQuery, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  const pagination = normalizePagination(page, limit);
  const [data, total] = await Promise.all([
    query.skip(pagination.skip).limit(pagination.limit).lean(),
    countQuery,
  ]);

  return {
    data,
    total,
    page: pagination.page,
    totalPages: Math.ceil(total / pagination.limit),
  };
}

function withSearchTimeout(promise, page, limit) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(emptyResult(page, limit)), SEARCH_TIMEOUT_MS);
    }),
  ]);
}

function makeProjection(fields, textQuery) {
  const projection = fields.reduce((acc, field) => {
    acc[field] = 1;
    return acc;
  }, {});

  return textQuery.isTextSearch
    ? { ...projection, ...textQuery.projection }
    : projection;
}

function stripTextScore(result) {
  return {
    ...result,
    data: result.data.map(({ score, ...item }) => item),
  };
}

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mergeFilters(...filters) {
  return filters.reduce((acc, filter) => ({ ...acc, ...filter }), {});
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function searchUsers(q, page, limit) {
  const textQuery = buildTextQuery(q, ["name", "email", "phone"]);
  const projection = makeProjection(
    ["name", "email", "phone", "role", "is_blocked", "createdAt"],
    textQuery,
  );

  return withSearchTimeout(
    (async () => {
      const result = await paginate(
        User.find(textQuery.filter, projection).sort(textQuery.sort),
        User.countDocuments(textQuery.filter),
        page,
        limit,
      );
      return stripTextScore(result);
    })(),
    page,
    limit,
  );
}

async function buildBusinessFilter(filters = {}, includeBlocked = false) {
  const filter = {};

  if (!includeBlocked) {
    filter.is_active = { $ne: false };
  }

  if (filters.city) {
    filter.city = { $regex: escapeRegExp(String(filters.city).trim()), $options: "i" };
  }

  if (filters.category) {
    const category = String(filters.category).trim();
    if (isValidObjectId(category)) {
      filter.category = category;
    } else {
      const matchingCategory = await Category.findOne(
        { name: { $regex: `^${escapeRegExp(category)}$`, $options: "i" } },
        { _id: 1 },
      ).lean();
      if (matchingCategory) {
        filter.category = matchingCategory._id;
      } else {
        filter.category = null;
      }
    }
  }

  if (filters.verified_status) {
    filter.verified_status = String(filters.verified_status).trim();
  }

  if (filters.rating !== undefined && filters.rating !== null && filters.rating !== "") {
    filter.rating = { $gte: Number(filters.rating) };
  }

  return filter;
}

async function searchBusinesses(q, filters = {}, page, limit, options = {}) {
  const textQuery = buildTextQuery(q, ["name", "description", "city", "address"]);
  const includeBlocked = options.includeBlocked === true;
  const projection = makeProjection(
    ["name", "slug", "city", "address", "phone", "rating", "logo", "verified_status", "createdAt"],
    textQuery,
  );

  return withSearchTimeout(
    (async () => {
      const businessFilter = await buildBusinessFilter(filters, includeBlocked);
      const filter = mergeFilters(businessFilter, textQuery.filter);
      const result = await paginate(
        Business.find(filter, projection).sort(textQuery.sort),
        Business.countDocuments(filter),
        page,
        limit,
      );
      return stripTextScore(result);
    })(),
    page,
    limit,
  );
}

async function searchCategories(q, page, limit) {
  const textQuery = buildTextQuery(q, ["name"]);
  const projection = makeProjection(["name", "slug"], textQuery);

  return withSearchTimeout(
    (async () => {
      const result = await paginate(
        Category.find(textQuery.filter, projection).sort(textQuery.sort),
        Category.countDocuments(textQuery.filter),
        page,
        limit,
      );
      const cleanResult = stripTextScore(result);
      return {
        ...cleanResult,
        data: cleanResult.data.map((item) => ({
          ...item,
          slug: item.slug || toSlug(item.name),
        })),
      };
    })(),
    page,
    limit,
  );
}

async function searchSubCategories(q, page, limit) {
  const textQuery = buildTextQuery(q, ["name"]);
  const projection = makeProjection(["name", "slug", "category_id"], textQuery);

  return withSearchTimeout(
    (async () => {
      const result = await paginate(
        SubCategory.find(textQuery.filter, projection)
          .populate("category_id", "name")
          .sort(textQuery.sort),
        SubCategory.countDocuments(textQuery.filter),
        page,
        limit,
      );
      const cleanResult = stripTextScore(result);
      return {
        ...cleanResult,
        data: cleanResult.data.map((item) => ({
          _id: item._id,
          name: item.name,
          slug: item.slug || toSlug(item.name),
          category: item.category_id?.name || null,
        })),
      };
    })(),
    page,
    limit,
  );
}

async function searchCities(q, page, limit) {
  const textQuery = buildTextQuery(q, ["name"]);
  const projection = makeProjection(["name", "state", "country"], textQuery);

  return withSearchTimeout(
    (async () => {
      const result = await paginate(
        City.find(textQuery.filter, projection).sort(textQuery.sort),
        City.countDocuments(textQuery.filter),
        page,
        limit,
      );
      const cleanResult = stripTextScore(result);
      return {
        ...cleanResult,
        data: cleanResult.data.map((item) => ({
          ...item,
          country: item.country || null,
        })),
      };
    })(),
    page,
    limit,
  );
}

function matchesPopulatedText(item, q, fields) {
  const query = normalizeQuery(q);
  if (!query) {
    return true;
  }

  const regex = new RegExp(escapeRegExp(query), "i");
  return fields.some((field) => regex.test(String(field(item) || "")));
}

async function searchReports(q, page, limit) {
  return withSearchTimeout(
    (async () => {
      const result = await paginate(
        Report.find({}, { reason: 1, status: 1, business_id: 1, user_id: 1, createdAt: 1 })
          .populate("business_id", "name city")
          .populate("user_id", "name email")
          .sort({ createdAt: -1 }),
        Report.countDocuments({}),
        page,
        limit,
      );

      return {
        ...result,
        data: result.data.filter((report) =>
          matchesPopulatedText(report, q, [
            (item) => item.reason,
            (item) => item.status,
            (item) => item.business_id?.name,
            (item) => item.user_id?.name,
          ]),
        ),
      };
    })(),
    page,
    limit,
  );
}

async function getOwnerBusinessIds(ownerId) {
  if (!ownerId || !isValidObjectId(ownerId)) {
    return [];
  }

  const businesses = await Business.find({ owner_id: ownerId }, { _id: 1 }).lean();
  return businesses.map((business) => business._id);
}

async function searchVerifications(q, page, limit, options = {}) {
  return withSearchTimeout(
    (async () => {
      const filter = {};

      if (options.ownerId) {
        const businessIds = await getOwnerBusinessIds(options.ownerId);
        if (!businessIds.length) {
          return emptyResult(page, limit);
        }
        filter.business_id = { $in: businessIds };
      }

      const result = await paginate(
        Verification.find(filter, {
          action: 1,
          reason: 1,
          business_id: 1,
          manager_id: 1,
          createdAt: 1,
        })
          .populate("business_id", "name city")
          .populate("manager_id", "name email")
          .sort({ createdAt: -1 }),
        Verification.countDocuments(filter),
        page,
        limit,
      );

      return {
        ...result,
        data: result.data.filter((verification) =>
          matchesPopulatedText(verification, q, [
            (item) => item.action,
            (item) => item.reason,
            (item) => item.business_id?.name,
            (item) => item.manager_id?.name,
          ]),
        ),
      };
    })(),
    page,
    limit,
  );
}

async function searchReviews(q, ownerId, page, limit, filters = {}) {
  const textQuery = buildTextQuery(q, ["comment"]);

  return withSearchTimeout(
    (async () => {
      const businessIds = await getOwnerBusinessIds(ownerId);
      if (!businessIds.length) {
        return emptyResult(page, limit);
      }

      const filter = mergeFilters(
        { business_id: { $in: businessIds } },
        textQuery.filter,
      );

      if (filters.rating !== undefined && filters.rating !== null && filters.rating !== "") {
        filter.rating = { $gte: Number(filters.rating) };
      }

      const projection = makeProjection(
        ["business_id", "user_id", "rating", "comment", "status", "owner_reply", "createdAt"],
        textQuery,
      );

      const result = await paginate(
        Review.find(filter, projection)
          .populate("business_id", "name slug city")
          .populate("user_id", "name profile_image")
          .sort(textQuery.sort),
        Review.countDocuments(filter),
        page,
        limit,
      );
      return stripTextScore(result);
    })(),
    page,
    limit,
  );
}

module.exports = {
  buildTextQuery,
  paginate,
  normalizePagination,
  searchUsers,
  searchBusinesses,
  searchCategories,
  searchSubCategories,
  searchCities,
  searchReports,
  searchVerifications,
  searchReviews,
};
