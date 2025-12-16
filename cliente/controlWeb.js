function ControlWeb() {

    this.mostrarModal = function (m) {
        $("#msgModal").remove();
        let cadena = "<div id='msgModal'>" + m + "</div>";
        $('#mBody').empty().append(cadena);
        $('#miModal').modal();
    }

    this.mostrarAgregarUsuario = function () {
        $('#bnv').remove();
        $('#mAU').remove();
        let cadena = '<div id="mAU">';
        cadena = cadena + '<div class="card"><div class="card-body">';
        cadena = cadena + '<div class="form-group">';
        cadena = cadena + '<label for="nick">Nick:</label>';
        cadena = cadena + '<p><input type="text" class="form-control" id="nick" placeholder="introduce un nick"></p>';
        cadena = cadena + '<button id="btnAU" type="submit" class="btn btn-primary">Submit</button>';
        cadena = cadena + '<div><a href="/auth/google"><img src="./cliente/img/btn_google_signin_light_focus_web@2x.png" style="height:40px;"></a></div>';
        cadena = cadena + '</div>';
        cadena = cadena + '</div></div></div>';

        if (!$("#mAU").length) $("#au").append(cadena);
        $("#btnAU").on("click", function () {
            let nick = $("#nick").val();
            if (typeof rest === 'undefined') {
                window.rest = new ClienteRest();
            }
            rest.agregarUsuario(nick);
            $("#mAU").remove();
        });
    }

    this.registrarUsuario = function (email, password) {
        $.ajax({
            type: 'POST',
            url: '/registrarUsuario',
            data: JSON.stringify({ "email": email, "password": password }),
            success: function (data) {
                if (data.nick != -1) {
                    console.log("Usuario " + data.nick + " ha sido registrado");
                    // Mostrar mensaje y formulario de login
                    cw.mostrarMensaje('Registro completado. Por favor inicie sesión.');
                    cw.mostrarLogin();
                } else {
                    console.log("El nick está ocupado");
                    cw.mostrarMensaje('Error: ya existe un usuario con ese email.');
                }
            },
            error: function (xhr, textStatus, errorThrown) { console.log("Status: " + textStatus); console.log("Error: " + errorThrown); }, contentType: 'application/json'
        });
    }

    // Mostrar formulario de inicio de sesión
    this.mostrarLogin = function () {
        if ($.cookie('nick')) {
            return true;
        }; 
        $("#fmLogin").remove(); 
        $("#registro").load("./cliente/login.html", function () { 
            $("#btnLogin").on("click", function () { 
                let email = $("#email").val(); 
                let pwd = $("#pwd").val(); 
                if (email && pwd) { 
                    rest.loginUsuario(email, pwd); 
                    console.log(email + " " + pwd); 
                } 
            }); 
        });
    }

    this.mostrarMensajeLogin = function (msg) {
        this.mostrarMensaje(msg);
    }

    this.mostrarMensaje = function (msg) {
        // Contenedor de notificaciones flotantes
        if ($('#msgContainer').length === 0) {
            $('body').append('<div id="msgContainer" style="position: fixed; top: 20px; right: 20px; z-index: 9999; width: 350px;"></div>');
        }
        
        const id = 'msg-' + Date.now();
        const html = `
            <div id="${id}" class="toast show" role="alert" aria-live="assertive" aria-atomic="true" data-autohide="true" data-delay="5000">
                <div class="toast-header bg-primary text-white">
                    <strong class="mr-auto">Sistema</strong>
                    <small>Ahora</small>
                    <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast" aria-label="Close" onclick="$('#${id}').remove()">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="toast-body">
                    ${msg}
                </div>
            </div>`;
            
        $('#msgContainer').append(html);
        
        // Auto-eliminar después de 5 segundos (fallback si bootstrap js no lo hace)
        setTimeout(function() {
            $(`#${id}`).fadeOut(500, function() { $(this).remove(); });
        }, 5000);
    };

    this.comprobarSesion = function () {
        // Comprobar sesión VALIDADA por servidor (no fiarse de la cookie local)
        if (typeof rest === 'undefined') { window.rest = new ClienteRest(); }
        $.getJSON('/ok')
            .done(function (data) {
                const nick = data && data.nick;
                // tratar -1 (numérico o string) como no autenticado
                if (nick && nick !== -1 && nick !== '-1') {
                    $.cookie('nick', nick);
                    cw.mostrarMensaje('Bienvenido al sistema, ' + nick);
                    if (typeof ws !== 'undefined') ws.email = nick; // Asignar email al cliente WS
                    cw.mostrarPanelOps();
                } else {
                    $.removeCookie('nick');
                    cw.mostrarRegistro();
                }
            })
            .fail(function () {
                $.removeCookie('nick');
                cw.mostrarRegistro();
            });
    }

    this.salir = function () {
        // Delegar en REST para cerrar sesión de servidor y limpiar estado local
        if (typeof rest === 'undefined') {
            window.rest = new ClienteRest();
        }
        rest.cerrarSesion();
    }

    // Dibuja un botón de salir para limpiar la sesión manualmente
    this.mostrarSalir = function () {
        if (document.getElementById('btnSalir')) return;
        // Colocar el botón de salir en la esquina superior izquierda del contenedor de mensajes
        const btn = '<div id="bnv" class="mb-2"><button id="btnSalir" class="btn btn-sm btn-outline-dark">Salir</button></div>';
        // Si hay un área de mensajes, insertar el botón antes del primer child para mostrarlo encima
        if ($('#au').children().length) {
            $('#au').prepend(btn);
        } else {
            $('#au').html(btn);
        }
        // Bind click to explicitly call the REST logout to avoid `this` binding issues
        $("#btnSalir").on('click', function () {
            if (typeof rest === 'undefined') { window.rest = new ClienteRest(); }
            rest.cerrarSesion();
        });
    }

    this.limpiar = function () {
        // Limpiar áreas de UI utilizadas por el flujo de autenticación
        try { $('#au').empty(); } catch (_) {}
        try { $('#registro').empty(); } catch (_) {}
        try { $('#mAU').remove(); } catch (_) {}
        try { $('#bnv').remove(); } catch (_) {}
        // try { $.removeCookie('nick'); } catch (_) {} // No eliminar cookie aquí
    }

    this.mostrarRegistro = function () {
        $("#fmRegistro").remove();
        $("#registro").load("./cliente/registro.html", function () {
            $("#btnRegistro").on("click", function (e) {
                e.preventDefault();
                let email = $("#email").val();
                let pwd = $("#pwd").val();
                if (email && pwd) {
                    // Delegar en el método que hace el POST
                    cw.registrarUsuario(email, pwd);
                } else {
                    cw.mostrarMensaje('Rellene email y contraseña.');
                }
            });
        });
    }

    // Mostrar panel con el resto de operaciones (6.3 exercises)
    this.mostrarPanelOps = function () {
        if (document.getElementById('opsPanel')) return; // ya creado
        this.limpiar();
        this.mostrarSalir();

        let partidaActual = '';
        if (ws.codigo) {
            partidaActual = '<hr /><h5 class="card-title">Partida Actual: ' + ws.codigo + '</h5>';
            if (ws.esHost) {
                partidaActual += '<button id="btnEliminarPartida" class="btn btn-danger btn-sm">Eliminar Partida</button>';
            } else {
                partidaActual += '<button id="btnSalirPartida" class="btn btn-warning btn-sm">Salir Partida</button>';
            }
        }

        const ops =
            '<div id="opsPanel" class="card mt-4">' +
            '  <div class="card-body">' +
            '    <h5 class="card-title">Operaciones</h5>' +
            '    <div class="mb-2">' +
            '      <button id="btnObtenerUsuarios" class="btn btn-outline-primary btn-sm">Obtener usuarios</button>' +
            '      <button id="btnNumeroUsuarios" class="btn btn-outline-secondary btn-sm ml-2">Número usuarios</button>' +
            '    </div>' +
            '    <div class="form-inline mb-2">' +
            '      <input id="nickCheck" class="form-control mr-2" placeholder="nick a comprobar">' +
            '      <button id="btnUsuarioActivo" class="btn btn-outline-success btn-sm">Usuario activo?</button>' +
            '    </div>' +
            '    <div class="form-inline mb-2">' +
            '      <input id="nickEliminar" class="form-control mr-2" placeholder="nick a eliminar">' +
            '      <button id="btnEliminarUsuario" class="btn btn-outline-danger btn-sm">Eliminar usuario</button>' +
            '    </div>' +
            '    <hr />' +
            '    <h5 class="card-title">Gestión de Partidas</h5>' +
            '    <div class="form-inline mb-2">' +
            '      <button id="btnCrearPartida" class="btn btn-primary btn-sm mr-2">Crear Partida</button>' +
            '    </div>' +
            '    <div class="form-inline mb-2">' +
            '      <input id="codigoPartida" class="form-control mr-2" placeholder="Código partida">' +
            '      <button id="btnUnirPartida" class="btn btn-success btn-sm">Unir a Partida</button>' +
            '    </div>' +
            partidaActual +
            '    <hr />' +
            '    <h5 class="card-title">Partidas Disponibles</h5>' +
            '    <div id="listaPartidas" class="list-group mb-3"></div>' +
            '    <hr />' +
            '    <pre id="opsResult" style="white-space:pre-wrap;"></pre>' +
            '  </div>' +
            '</div>';

        $("#au").append(ops);

        $("#btnEliminarPartida").on("click", function() {
            ws.eliminarPartida();
        });
        $("#btnSalirPartida").on("click", function() {
            ws.salirPartida();
        });

        // Handlers
        $("#btnCrearPartida").on("click", function () {
            let nick = $.cookie("nick");
            if (nick) {
                ws.crearPartida();
            } else {
                cw.mostrarModal("Debes iniciar sesión para crear una partida.");
            }
        });

        $("#btnUnirPartida").on("click", function () {
            let nick = $.cookie("nick");
            let codigo = $("#codigoPartida").val();
            if (nick && codigo) {
                ws.unirAPartida(codigo);
            } else {
                cw.mostrarModal("Debes iniciar sesión e introducir un código.");
            }
        });

        $("#btnObtenerUsuarios").on('click', () => {
            $.getJSON('/obtenerUsuarios', function (data) {
                const keys = Object.keys(data || {});
                $("#opsResult").text('Usuarios (' + keys.length + '):\n' + keys.join('\n'));
            }).fail(function () {
                $("#opsResult").text('Error al obtener usuarios');
            });
        });

        $("#btnNumeroUsuarios").on('click', () => {
            $.getJSON('/numeroUsuarios', function (data) {
                if (data && data.num !== undefined) {
                    $("#opsResult").text('Número de usuarios: ' + data.num);
                } else {
                    $("#opsResult").text('Respuesta inesperada: ' + JSON.stringify(data));
                }
            }).fail(function () {
                $("#opsResult").text('Error al obtener número de usuarios');
            });
        });

        $("#btnUsuarioActivo").on('click', () => {
            const nick = $("#nickCheck").val();
            if (!nick) {
                $("#opsResult").text('Introduce un nick a comprobar');
                return;
            }
            $.getJSON('/usuarioActivo/' + encodeURIComponent(nick), function (data) {
                $("#opsResult").text('usuarioActivo("' + nick + '") -> ' + JSON.stringify(data));
            }).fail(function () {
                $("#opsResult").text('Error al comprobar usuario activo');
            });
        });

        $("#btnEliminarUsuario").on('click', () => {
            const nick = $("#nickEliminar").val();
            if (!nick) {
                $("#opsResult").text('Introduce un nick a eliminar');
                return;
            }
            $.getJSON('/eliminarUsuario/' + encodeURIComponent(nick), function (data) {
                $("#opsResult").text('eliminarUsuario("' + nick + '") -> ' + JSON.stringify(data));
            }).fail(function () {
                $("#opsResult").text('Error al eliminar usuario');
            });
        });
    };


    this.mostrarEsperandoRival = function() {
        this.limpiar();
        // Mostrar animación o mensaje de esperando rival
        // Usamos un spinner de Bootstrap
        let cadena = '<div id="mER" class="text-center mt-5">';
        cadena += '<h3>Esperando rival...</h3>';
        cadena += '<div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div>';
        if (ws.codigo) {
            cadena += '<p class="mt-3">Código de partida: <strong>' + ws.codigo + '</strong></p>';
        }
        cadena += '<button id="btnCancelarPartida" class="btn btn-danger mt-3">Cancelar Partida</button>';
        cadena += '</div>';
        $('#au').append(cadena);

        $("#btnCancelarPartida").on("click", function() {
            ws.salirPartida();
        });
    }

    this.mostrarListaPartidas = function (lista) {
        $("#listaPartidas").empty();
        if (lista.length === 0) {
            $("#listaPartidas").append('<div class="list-group-item">No hay partidas disponibles</div>');
            return;
        }
        
        lista.forEach(function(partida) {
            let item = $('<a href="#" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"></a>');
            item.append('<span>Partida <strong>' + partida.codigo + '</strong> (Creador: ' + partida.email + ')</span>');
            let btn = $('<button class="btn btn-sm btn-success">Unirse</button>');
            
            btn.on("click", function(e) {
                e.preventDefault();
                let nick = $.cookie("nick");
                if (nick) {
                    if (typeof ws !== 'undefined' && !ws.email) ws.email = nick;
                    ws.unirAPartida(partida.codigo);
                } else {
                    cw.mostrarModal("Debes iniciar sesión.");
                }
            });
            
            item.append(btn);
            $("#listaPartidas").append(item);
        });
    }

    window.ControlWeb = ControlWeb;
}