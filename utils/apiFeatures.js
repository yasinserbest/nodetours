class APIFeatures {
  constructor(query, queryString) {
    //ilki mongoose query ikincisi expressten alınan (anlamadım)
    this.query = query;
    this.queryString = queryString;
  }
  filter() {
    //BUILD QUERY
    //1A) FILTERING

    const queryObj = { ...this.queryString }; //req.query'nin aynısını oluşturduk.
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]); //queryObj'de excludedFields var ise onları dışladık

    //1B) ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }
  sort() {
    //2) SORTING
    if (this.queryString.sort) {
      //req.query url'den gelenleri yazıyor hala aklında olsun unutmadın dimi?. ben urle ?sort=price dediğim için o sort'u query olarak aldı. orda sort yerine xx yazsaydım burda da xx yazıcaktım
      const sortBy = this.queryString.sort.split(',').join(' '); //birden fazla sorgu gelirse url kısmında virgülle, onları vs de aralarında virgül değil space ile almam lazım o yüzden böyle yaptım.
      //sort('price rating');
      this.query = this.query.sort(sortBy);
    }
    return this;
  }

  limitFields() {
    //3) Field Limiting
    if (this.queryString.fields) {
      const fields = req.query.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); //mongoose'un otomatik olarak kullandığı bu __v kısmını - diyerek dışlamış oldum artık gelmeyecek karşıma.
    }
    return this;
  }
  paginate() {
    //4)Pagination
    const page = this.queryString.page * 1 || 1; //page tanımlı değilse queryde falan default olarak 1 alıcak.
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
