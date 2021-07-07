const cors = require('cors');

module.exports = function(app, express)  {

    //Middlewares
    app.use(cors());
    app.use(express.json({limit: '50mb'}));
    app.use(express.urlencoded({extended: true, limit: '50mb'}));
    app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();

})
}