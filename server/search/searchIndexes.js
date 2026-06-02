const User = require("../api/user/userModel");
const Business = require("../api/business/businessModel");
const Category = require("../api/category/categoryModel");
const SubCategory = require("../api/subCategory/subCategoryModel");
const City = require("../api/cities/citiesModel");
const Report = require("../api/reports/reportModel");
const Verification = require("../api/verification/verificationModel");
const { Review } = require("../api/review/reviewModel");

let indexesInitialized = false;

const SEARCH_INDEXES = [
  [User, { name: "text", email: "text", phone: "text" }, "users_text_search"],
  [User, { role: 1, is_blocked: 1 }, "users_role_blocked_idx"],
  [User, { createdAt: -1 }, "users_created_at_idx"],

  [
    Business,
    { name: "text", description: "text", city: "text", address: "text" },
    "businesses_text_search",
  ],
  [
    Business,
    { category: 1, city: 1, verified_status: 1 },
    "businesses_category_city_status_idx",
  ],
  [Business, { rating: -1, createdAt: -1 }, "businesses_rating_created_idx"],
  [Business, { is_blocked: 1 }, "businesses_blocked_idx"],
  [Business, { is_active: 1 }, "businesses_active_idx"],

  [Category, { name: "text" }, "categories_text_search"],

  [
    SubCategory,
    { name: "text", category_id: 1 },
    "subcategories_text_category_idx",
  ],

  [City, { name: "text" }, "cities_text_search"],

  [Report, { reason: "text", status: 1, createdAt: -1 }, "reports_text_status_created_idx"],

  [
    Verification,
    { action: 1, createdAt: -1, business_id: 1 },
    "verifications_action_created_business_idx",
  ],

  [
    Review,
    { comment: "text", business_id: 1, rating: -1, createdAt: -1 },
    "reviews_text_business_rating_created_idx",
  ],
];

function hasTextKey(spec) {
  return Object.values(spec).some((value) => value === "text");
}

function getTextIndexName(indexes) {
  const textIndex = indexes.find((index) => index.weights);
  return textIndex?.name;
}

async function createSearchIndex(model, spec, name) {
  try {
    await model.collection.createIndex(spec, {
      name,
      background: true,
    });
  } catch (error) {
    if (hasTextKey(spec)) {
      try {
        const existingTextIndexName = getTextIndexName(await model.collection.indexes());
        if (existingTextIndexName && existingTextIndexName !== name) {
          await model.collection.dropIndex(existingTextIndexName);
          await model.collection.createIndex(spec, {
            name,
            background: true,
          });
          return;
        }
      } catch (rebuildError) {
        console.warn(
          `[searchIndexes] Could not rebuild ${name}: ${rebuildError.message}`,
        );
        return;
      }
    }

    console.warn(
      `[searchIndexes] Could not create ${name}: ${error.message}`,
    );
  }
}

async function ensureSearchIndexes() {
  if (indexesInitialized) {
    return;
  }

  indexesInitialized = true;
  await Promise.all(
    SEARCH_INDEXES.map(([model, spec, name]) => createSearchIndex(model, spec, name)),
  );
}

module.exports = {
  ensureSearchIndexes,
  SEARCH_INDEXES,
};
