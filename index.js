require('dotenv').config();
const fs = require("fs");
const path = require('path');
// Log uncaught errors to help debugging (prevents silent exits)
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});
const express = require('express');
const bodyParser=require("body-parser");
const app = express();

const passport=require("passport");
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
require("./servidor/passport-setup.js");
const modelo = require("./servidor/modelo.js");
let sistema = new modelo.Sistema();

const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname + "/"));
// Parse URL-encoded bodies (needed for Google One Tap POSTs)
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({extended:true})); 
app.use(bodyParser.json());

// Configurar sesión con express-session (más compatible con Passport)
app.set('trust proxy', 1);
app.use(session({
    secret: process.env.SESSION_SECRET || 'sistema-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());

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


// Registrar LocalStrategy ahora que 'sistema' existe
passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' },
    function(email, password, done) {
        sistema.loginUsuario({ email: email, password: password },
            function(user) {
                // si loginUsuario devuelve {email:-1} indicar fallo
                    // si loginUsuario devuelve un usuario válido, autenticarlo
                    if (user && user.email && user.email !== -1) {
                        return done(null, user);
                    }
                    // credenciales inválidas
                    return done(null, false);
            }
        );
    }
));

app.get("/auth/google",passport.authenticate('google', { scope: ['profile','email'] }))
app.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/fallo' }), 
    function(req, res) { 
        res.redirect('/good'); 
});
// Ruta para recibir el callback de Google One Tap
app.post('/oneTap/callback', 
    passport.authenticate('google-one-tap', { failureRedirect: '/fallo' }), 
    function(req, res) {
        // Autenticación correcta: reutilizamos la ruta /good
        res.redirect('/good');
    }
);

app.get("/good", function(request,response){
    let email=request.user.emails[0].value;
    sistema.usuarioGoogle({"email":email},function(obj){
    // Guardar cookie visible para cliente y también almacenar en la sesión
    response.cookie('nick',obj.email);
    try { request.session.nick = obj.email; } catch(_) {}
    // Marcar usuario activo también para flujo Google / One Tap
    if (!sistema.usuarioActivo(obj.email).res){
        sistema.agregarUsuario(obj.email);
    }
    response.redirect('/');
    });
});

app.get("/fallo",function(request,response){ 
    // Respuesta uniforme para fallos de autenticación (cliente espera {nick: -1})
    response.send({ nick: -1 });
});

// Middleware de logging (opcional)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Página principal -> servir el cliente
app.get("/", function(request, response) {
    response.sendFile(path.join(__dirname, "cliente", "index.html"));
});

app.get("/confirmarUsuario/:email/:key",function(request,response){ 
    let email=request.params.email; 
    let key=request.params.key; sistema.confirmarUsuario({"email":email,"key":key},function(usr){ 
        if (usr.email!=-1){ 
            response.cookie('nick',usr.email);
            try { request.session.nick = usr.email; } catch(_) {}
        } 
        response.redirect('/'); 
    }); 
});


app.get("/cerrarSesion",function(request,response){ 
    // Passport 0.7 logout con callback
    request.logout(function(){
        // limpiar cookie de sesión (cookie-session la invalidará al no tener datos)
        try { request.session = null; } catch(_) {}
        response.clearCookie('nick');
        response.send({ok:true});
    });
});

app.post("/registrarUsuario",function(request,response){ 
    sistema.registrarUsuario(request.body,function(res){ 
        // email:-1 => duplicado; email:-2 => existe pero sin confirmar
        if (res && res.email){
            return response.send({ nick: res.email });
        }
        return response.send({ nick: -1 });
    }); 
});

// Endpoint para inicio de sesión (AJAX-friendly)
app.post('/loginUsuario', function(request, response) {
    sistema.loginUsuario(request.body, function(user) {
        if (user && user.email && user.email !== -1) {
            // Crear sesión Passport para este usuario
            request.logIn(user, function(err) {
                if (err) {
                    console.error('Error logIn:', err);
                    return response.send({ nick: -1 });
                }
                try { request.session.nick = user.email; } catch(_) {}
                response.cookie('nick', user.email);
                return response.send({ nick: user.email });
            });
        } else {
            return response.send({ nick: -1 });
        }
    });
});

app.get("/ok",function(req,res){
    // Endpoint que devuelve el usuario autenticado (si existe), o {nick: -1}
    const email = (req.user && req.user.email) || (req.session && req.session.nick);
    if (email) return res.send({ nick: email });
    return res.send({ nick: -1 });
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