module.exports = new (require('../Engine'))({
  "id": "google.com",
  "name": "Google",
  "site": "https://www.google.com/",
  "queryUrl": "https://www.googleapis.com/customsearch/v1?key={apiKey}&q={searchTerms}&cx={cx}",
  "suggestUrl": "https://www.google.com/complete/search?client=firefox&q={searchTerms}",
  "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABUUlEQVR42pWTzUsCYRCH9y9zu3SooCCkjhIRRLeIykXokiWCJ7PvDpZRlz6si1lIQZ3SQxQdOhREpgSm0JeQvfu0+i6I7LKLh4F5h5nnnRl+o6jTdHn8omAYbVqhXqvYFXcEBKFDwcoZZB8B4LkEB9cwGGmFKHb01A1EU9JXzfdvDYZi1lwLwBcVAIwsNWPesIwls7gDtB2Z7N9ujVe+IX2LO2AgItB1OL9vJqsmILDrOoK02IkBAdYy4FsQJC5h+VQCHQDWTqYSgo8fuHuRxS4Ae3stQ7UGE5ttAHqCUgfxC7m4ryrowOyeO6CxqHwZxtYFqtYc5+kNan/gDTsAeueEIRj7n/rmRQMwueUAGF0VAAT3rQBTC0Y3DoDOGbm00icML4oWHYSTgo0MFqjlmPpDgqMcFCuQf4erBzjOwXjcriu9qHg0uutO2+es6fl67T9ptebvFRjBVgAAAABJRU5ErkJggg=="
});
