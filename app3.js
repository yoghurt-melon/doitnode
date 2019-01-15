/////////////////// requrie ////////////////////////////////
var express = require('express');
var http = require('http');
var static = require('serve-static');
var path = require('path');

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');

var mongoose = require('mongoose');

// 에러 핸들러 모듈
var expressErrorHandler = require('express-error-handler');
/////////////////// requrie ////////////////////////////////

var database;
var UserScheme;
var UserModel;

function connectDB() {
    var databaseUrl = 'mongodb://localhost:27017/local';

    mongoose.Promise = global.Promise;
    mongoose.connect(databaseUrl);
    database = mongoose.connection;

    // 데이터베이스가 연결됐을 때
    database.on('open', function () {
        console.log('데이터베이스에 연결됨 : ' + databaseUrl);

        UserScheme = mongoose.Schema({
            id: String,
            name: String,
            password: String
        });

        console.log('UserSchema 정의');

        // users 컬렉션을 UserScheme에 연결
        UserModel = mongoose.model('users', UserScheme);
        console.log('UserModel 정의');
    });

    database.on('disconnected', function () {
        console.log('데이터베이스 연결 끊어짐');
    });

    database.on('disconnected', console.error.bind(console, 'mongoose 연결 에러.'));
}

// express로 app객체 생성
var app = express();

app.set('port', process.env.PORT || 3000);
app.use(static(path.join(__dirname, 'public')));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(expressSession({
    secret: 'my key',
    resave: true,
    saveUninitialized: true
}));

var router = express.Router();

router.route('/login').post(function (req, res) {
    console.log('/login 라우팅 함수 호출됨.');

    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    console.log(`요청 파라미터 : ${paramId}, ${paramPassword}`);

    if (database) {
        authUser(database, paramId, paramPassword, function (err, docs) {
            if (err) {
                console.log('에러 발생');
                res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
                res.write('<h1>에러 발생</h1>');
                res.end();
                return;
            }

            if (docs) {
                console.dir(docs);
                res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
                res.write('<h1>사용자 로그인 성공</h1>');
                res.write(`<div><p>사용자 : ${docs[0].name}</p></div>`);
                res.write('<br><br><a href="/login.html">다시 로그인하기</a>');
                res.end();
            } else {
                console.log('에러 발생');
                res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
                res.write('<h1>없는 사용자 입니다.</h1>');
                res.end();
            }
        });
    } else {
        console.log('에러 발생');
        res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
        res.write('<h1>데이터베이스 연결 안됨</h1>');
        res.end();
    }
});

router.route('/adduser').post(function (req, res) {
    console.log('/adduser 라우팅 함수 호출됨.');

    var paramId = req.body.id || req.query.id;
    var paramPassword = req.body.password || req.query.password;
    var paramName = req.body.name || req.query.name;

    console.log(`요청 파라미터 : ${paramId}, ${paramPassword}, ${paramName}`);

    if (database) {
        addUser(database, paramId, paramPassword, paramName, function (err, result) {
            if (err) {
                console.log('에러 발생');
                res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
                res.write('<h1>에러 발생</h1>');
                res.end();
                return;
            }

            if (result) {
                console.dir(result);
                res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
                res.write('<h1>사용자 추가 성공</h1>');
                res.write(`<div><p>사용자 : ${paramName}</p></div>`);
                res.end();
            } else {
                console.log('에러 발생');
                res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
                res.write('<h1>사용자 추가실패</h1>');
                res.end();
            }
        });
    } else {
        console.log('에러 발생');
        res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
        res.write('<h1>데이터베이스 연결 안됨</h1>');
        res.end();
    }
});

app.use('/', router);

var authUser = function (db, id, password, callback) {
    console.log(`authUser 호출됨 :  ${id}, ${password}`);

    UserModel.find({ "id": id, "password": password }, function (err, docs) {
        if (err) {
            callback(err, null);
            return;
        }

        if (docs.length > 0) {
            console.log('일치하는 사용자를 찾음.');
            callback(null, docs);
        } else {
            console.log('일치하는 사용자 없음');
            callback(null, null);
        }
    });
};

var addUser = function (db, id, password, name, callback) {
    console.log(`addUser 호출됨 : ${id}, ${password}, ${name}`);

    var user = new UserModel({"id":id, "password":password, "name":name});

    user.save(function(err) {
        if(err) {
            callback(err, null);
            return;
        }

        console.log('사용자 데이터 추가함.');
        callback(null, user);
    });
};

var errorHandler = expressErrorHandler({
    static: {
        '404': './public/404.html'
    }
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

var server = http.createServer(app).listen(app.get('port'), function () {
    console.log('익스프레스로 웹 서버를 실행함 : ' + app.get('port'));

    // 웹 서버 정상실행 후 db연결
    connectDB();
});







// // 다중접속 문제 해결
// app.use(cors());

// var storage = multer.diskStorage({
//     destination: function (req, file, callback) {
//         callback(null, 'uploads');
//     },
//     filename: function (req, file, callback) {
//         // 뒤에 시간정보가 붙어 확장자를 살리지 못한다.
//         // callback(null, file.originalname + Date.now());

//         // 확장자를 살리기위해 파일이름과 확장자를 따로 구한다.
//         var extension = path.extname(file.originalname);
//         var basename = path.basename(file.originalname, extension);

//         console.log('extension = ' + extension);
//         console.log('basename = ' + basename);
//         console.log('path.basename(file.originalname) = ' + path.basename(file.originalname));

//         callback(null, basename + Date.now() + extension);
//     }
// });

// var upload = multer({
//     storage: storage,
//     limits: {
//         files: 10,
//         fileSize: 1024 * 1024 * 1024
//     }
// })

// var router = express.Router();

// // 포토라는 이름으로 넘어온 파일 1개를 배열에 저장
// router.route('/photo').post(upload.array('photo', 1), (req, res) => {
//     console.log('/photo 라우팅 함수 호출됨');

//     var files = req.files;
//     console.log('==== 업로드된 파일 ====');

//     if(files.length > 0) {
//         console.dir(files[0]);
//     } else {
//         console.log('파일이 없습니다.');
//     }

//     var originalname;
//     var filename;
//     var mimetype;
//     var size;
//     if(Array.isArray(files)) {
//         files.forEach(file => {
//             originalname = file.originalname;
//             filename = file.filename;
//             mimetype = file.mimetype;
//             size = file.size;
//         });
//     }

//     res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
//     res.write('<h1>파일 업로드 성공</h1>');
//     res.write(`<p>원본파일 : ${originalname}</p>`);
//     res.write(`<p>저장파일 : ${filename}</p>`);
// });

// router.route('/product').get(function (req, res) {
//     console.log('/product 라우팅 함수 호출됨.');

//     if (req.session.user) {
//         res.redirect('/product.html');
//     } else {
//         res.redirect('/login2.html');
//     }
// });

// router.route('/login').post(function (req, res) {
//     console.log('/login 라우팅 함수 호출됨.');

//     var paramId = req.body.id || req.query.id;
//     var paramPassword = req.body.password || req.query.password;
//     console.log(`요청 파라미터 : ${paramId}, ${paramPassword}`);

//     if (req.session.user) {
//         console.log('이미 로그인 되어 있습니다.');

//         res.redirect('/product.html');
//     } else {
//         req.session.user = {
//             id: paramId,
//             name: '트와이스',
//             authorized: true
//         };

//         res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
//         res.write('<h1>로그인 성공</h1>');
//         res.write(`<p>ID : ${paramId}</p>`);
//         res.write(`<br><br><a href="/product">상품 페이지</a>`);
//         res.end();
//     }
// });

// router.route('/logout').get(function (req, res) {
//     if (req.session.user) {
//         console.log('로그아웃합니다.');

//         req.session.destroy(function (err) {
//             if (err) {
//                 console.log('세션 에러 발생.');
//                 return;
//             }

//             console.log('세션 삭제 성공.');
//             res.redirect('/login2.html');
//         });
//     } else {
//         console.log('로그인 되어 있지 않습니다.');
//         res.redirect('/login2.html');
//     }
// });

// router.route('/setUserCookie').get(function (req, res) {
//     console.log('/setUserCookie 라우팅 함수 호출됨.');

//     res.cookie('user', {
//         id: 'kimsb',
//         name: '트와이스',
//         authorized: true
//     });

//     res.redirect('/showCookie');
// });

// router.route('/showCookie').get(function (req, res) {
//     console.log('/showCookie 라우팅 함수 호출됨.');

//     res.send(req.cookies);
// });

// router.route('/login').post(function (req, res) {
//     console.log('/login 라우팅 함수에서 받음.');

//     var paramId = req.body.id || req.query.id;
//     var paramPassword = req.body.password || req.query.password;

//     res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
//     res.write(`<h1>서버에서 로그인 응답</h1>`);
//     res.write(`<div><p>${paramId}</p></div>`);
//     res.write(`<div><p>${paramPassword}</p></div>`);
//     res.end();
// });

// app.use('/', router);

// // 모든 요청에 대해서 처리하겠다.
// app.all('*', function (req, res) {
//     res.status(404).send('<h1>요청하신 페이지를 찾을 수 없습니다.</h1>');
// });

// var server = http.createServer(app).listen(app.get('port'), function () {
//     console.log('익스프레스로 웹 서버를 실행함 : ' + app.get('port'));
// });