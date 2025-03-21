//queryString is the same as req.query
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //1A.Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
    //we return these so that we have access to the result of this method so that we can chain other methods on it
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      //The Above line would convert the sort field here "127.0.0.1:3000/api/v1/tours?sort=ratings,price" to "sort=ratings price" which is the format required by mongoDB to filter data using sort method.
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      //The Above line would convert the fields field here "127.0.0.1:3000/api/v1/tours?fields=name,duration,ratings" to "fields=name duration ratings" which is the format required by mongoDB to filter data using fields.
      this.query = this.query.select(fields);
    } else {
      //In case user dosen't specify the fields field
      this.query = this.query.select('-__v');
      //Here we are excluding the "__v", by negating it with minus sign
    }

    return this;
  }

  paginate() {
    //4.Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    //Above, we are setting the default values for pagination, i.e If we have a million docs in DB, user would just be shown 100 docs per page
    const skip = (page - 1) * limit;
    //page=3&limit=10, 1-10 page 1, 11-20 page 2, 21-30 page 3
    // query = query.skip(20).limit(10);
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
