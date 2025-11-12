const fs = require("fs");
const path = require("path");
try { require('dotenv').config(); } catch(_) {} // Ensure dotenv is loaded at startup
const express = require('express');
const app = express();
const modelo = require("./servidor/modelo.js");
const passport=require("passport");

const cookieSession=require("cookie-session");
require("./servidor/passport-setup.js");
const bodyParser=require("body-parser");
const PORT = process.env.PORT || 3000;
const LocalStrategy = require('passport-local').Strategy;
// Middleware para asegurar rutas REST (Sprint 2 - asegurar API)
const haIniciado=function(request,response,next){ 
    if (request.user){ 
        return next(); 
    }
    // Intento de fallback a cookie/localStorage no es fiable desde servidor; devolver 401 JSON
    if (request.accepts('json')){
        return response.status(401).send({error:'No autenticado'});
    }
    response.redirect("/"); 
};


app.use(express.static(__dirname + "/"));
// Parse URL-encoded bodies (needed for Google One Tap POSTs)
app.use(express.urlencoded({ extended: true }));

app.use(bodyParser.urlencoded({extended:true})); 
app.use(bodyParser.json());

let sistema = new modelo.Sistema();

// Registrar LocalStrategy ahora que 'sistema' existe
passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' },
    function(email, password, done) {
        sistema.loginUsuario({ email: email, password: password },
            function(user) {
                // si loginUsuario devuelve {email:-1} indicar fallo
                if (user && user.email && user.email !== -1) return done(null, user);
                return done(null, false);
            }
        );
    }
));

// Middleware de logging (opcional)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.use(cookieSession({ name: 'Sistema', keys: ['key1', 'key2'] }));
// Compatibilidad cookie-session + passport: añadir métodos no-op para regenerate/save
app.use((req, res, next) => {
    if (req.session && typeof req.session.regenerate !== 'function') {
        req.session.regenerate = (cb) => cb && cb();
    }
    if (req.session && typeof req.session.save !== 'function') {
        req.session.save = (cb) => cb && cb();
    }
    next();
});

app.use(passport.initialize());
app.use(passport.session());

// Página principal -> servir el cliente
app.get("/", function(request, response) {
    response.sendFile(path.join(__dirname, "cliente", "index.html"));
});

app.get("/confirmarUsuario/:email/:key",function(request,response){ 
    let email=request.params.email; 
    let key=request.params.key; sistema.confirmarUsuario({"email":email,"key":key},function(usr){ 
        if (usr.email!=-1){ 
            response.cookie('nick',usr.email); 
        } 
        response.redirect('/'); 
    }); 
});

// Nota: rutas REST se definen más abajo (con protección)

// Página principal
app.get("/auth/google",passport.authenticate('google', { scope: ['profile','email'] }))

app.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/fallo' }), 
    function(req, res) { 
        res.redirect('/good'); 
});

app.get("/cerrarSesion",function(request,response){ 
    // Passport 0.7 logout con callback
    request.logout(function(){
        // limpiar cookie de sesión (cookie-session la invalidará al no tener datos)
        response.clearCookie('nick');
        response.send({ok:true});
    });
});

// Ruta para recibir el callback de Google One Tap
app.post('/oneTap/callback', 
    passport.authenticate('google-one-tap', { failureRedirect: '/fallo' }), 
    function(req, res) {
        // Autenticación correcta: reutilizamos la ruta /good
        res.redirect('/good');
    }
);

app.post("/registrarUsuario",function(request,response){ 
    sistema.registrarUsuario(request.body,function(res){ 
        // email:-1 => duplicado; email:-2 => existe pero sin confirmar
        if (res && res.email){
            return response.send({ nick: res.email });
        }
        return response.send({ nick: -1 });
    }); 
});

// Endpoint para inicio de sesión
/*
app.post("/loginUsuario", function(request, response) {
    sistema.loginUsuario(request.body, function(res) {
        if (res && res.email && res.email != -1) {
            response.cookie('nick', res.email);
            response.send({ nick: res.email });
        } else {
            response.send({ nick: -1 });
        }
    });
});
*/

app.post('/loginUsuario', function(req,res,next){
    passport.authenticate("local", function(err,user){
        if (err) return next(err);
        if (!user) return res.status(401).send({nick:-1});
        req.logIn(user,function(err2){
            if (err2) return next(err2);
            res.cookie('nick',user.email);
            return res.send({nick:user.email});
        });
    })(req,res,next);
});

app.get("/ok",function(request,response){ 
    if (!request.user) return response.status(401).send({nick:-1});
    response.send({nick:request.user.email}); 
});


app.get("/good", function(request,response){ 
    let email=request.user.emails[0].value; 
    sistema.usuarioGoogle({"email":email},function(obj){ 
        response.cookie('nick',obj.email); 
        response.redirect('/'); 
    }); 
});

app.get("/fallo",function(request,response){ 
    response.send({nick:"nook"}) 
});



// REST: agregar usuario (protegido)
app.get("/agregarUsuario/:nick", haIniciado, function(request, response) {
    const nick = request.params.nick;
    const payload = sistema.agregarUsuario(nick);
    response.send(payload);
});
console.log('Ruta /agregarUsuario/:nick registrada');

// REST: obtener usuarios (protegido)
app.get("/obtenerUsuarios", haIniciado, function(request, response) {
    const payload = sistema.obtenerUsuarios();
    response.send(payload);
});
console.log('Ruta /obtenerUsuarios registrada');

// REST: usuario activo (protegido)
app.get("/usuarioActivo/:nick", haIniciado, function(request, response) {
    const nick = request.params.nick;
    const payload = sistema.usuarioActivo(nick);
    response.send(payload);
});
console.log('Ruta /usuarioActivo/:nick registrada');

//let sistema = new modelo.Sistema({test: true});   NO SE QUE HACE ESTO (pruebas)

// REST: numero de usuarios (protegido)
app.get("/numeroUsuarios", haIniciado, function(request, response) {
    const payload = { num: sistema.numeroUsuarios() };
    response.send(payload);
});
console.log('Ruta /numeroUsuarios registrada');

// REST: eliminar usuario (protegido)
app.get("/eliminarUsuario/:nick", haIniciado, function(request, response){
    const nick = request.params.nick;
    const payload = sistema.eliminarUsuario(nick);
    response.send(payload);
});
console.log('Ruta /eliminarUsuario/:nick registrada');

// Ruta de depuración opcional
app.get('/routes', (req, res) => {
    const routes = [];
    if (app && app._router && app._router.stack) {
        app._router.stack.forEach((middleware) => {
            if (middleware.route) {
                routes.push(middleware.route.path);
            } else if (middleware.name === 'router') {
                middleware.handle.stack.forEach(function(handler) {
                    if (handler.route) routes.push(handler.route.path);
                });
            }
        });
    }
    res.send({ routes });
});

// Arrancar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`App está escuchando en http://0.0.0.0:${PORT}`);
    console.log('Ctrl+C para salir');
});

// 404
app.use((req, res) => {
    console.log(`Final 404 reached for ${req.method} ${req.url}`);
    res.status(404).send('Not Found on Node server');
});