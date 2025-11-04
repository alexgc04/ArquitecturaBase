const fs = require("fs");
const path = require("path");
const express = require('express');
const app = express();
const modelo = require("./servidor/modelo.js");

const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname + "/"));
let sistema = new modelo.Sistema();

// Middleware de logging (opcional)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Página principal
app.get("/", function(request, response) {
    response.sendFile(path.join(__dirname, "cliente", "index.html"));
});

// REST: agregar usuario
app.get("/agregarUsuario/:nick", function(request, response) {
    const nick = request.params.nick;
    const payload = sistema.agregarUsuario(nick);
    response.send(payload);
});
console.log('Ruta /agregarUsuario/:nick registrada');

// REST: obtener usuarios
app.get("/obtenerUsuarios", function(request, response) {
    const payload = sistema.obtenerUsuarios();
    response.send(payload);
});
console.log('Ruta /obtenerUsuarios registrada');

// REST: usuario activo
app.get("/usuarioActivo/:nick", function(request, response) {
    const nick = request.params.nick;
    const payload = sistema.usuarioActivo(nick);
    response.send(payload);
});
console.log('Ruta /usuarioActivo/:nick registrada');

//let sistema = new modelo.Sistema({test: true});   NO SE QUE HACE ESTO (pruebas)

// REST: numero de usuarios
app.get("/numeroUsuarios", function(request, response) {
    const payload = { num: sistema.numeroUsuarios() };
    response.send(payload);
});
console.log('Ruta /numeroUsuarios registrada');

// REST: eliminar usuario
app.get("/eliminarUsuario/:nick", function(request, response){
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
    const addr = server.address();
    console.log(`App está escuchando en http://${addr.address}:${addr.port}`);
    console.log('Ctrl+C para salir');
});

// 404
app.use((req, res) => {
    console.log(`Final 404 reached for ${req.method} ${req.url}`);
    res.status(404).send('Not Found on Node server');
});