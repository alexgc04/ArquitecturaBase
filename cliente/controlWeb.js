function ControlWeb() {
    
    this.mostrarAgregarUsuario = function () {
        $('#bnv').remove(); 
        $('#mAU').remove(); 
        let cadena='<div id="mAU">'; 
        cadena = cadena + '<div class="card"><div class="card-body">';
        cadena = cadena +'<div class="form-group">'; 
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

    this.registrarUsuario=function(email,password){ 
        $.ajax({ 
            type:'POST', 
            url:'/registrarUsuario', 
            data: JSON.stringify({"email":email,"password":password}), 
            success:function(data){ 
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
            error:function(xhr, textStatus, errorThrown){ console.log("Status: " + textStatus); console.log("Error: " + errorThrown); }, contentType:'application/json' }); }

    // Mostrar formulario de inicio de sesión
    this.mostrarLogin=function(){
        if ($.cookie('nick')){
            return true;
        }
        $("#fmLogin").remove();
        $("#registro").load("./cliente/login.html", function() {
            $("#btnLogin").on("click", function(e) {
                e.preventDefault();
                const email = $("#emailLogin").val();
                const pwd = $("#pwdLogin").val();
                if (!email || !pwd) {
                    cw.mostrarMensaje('Rellene email y contraseña.');
                    return;
                }
                if (typeof rest === 'undefined') {
                    window.rest = new ClienteRest();
                }
                rest.loginUsuario({ email: email, password: pwd });
                $("#fmLogin").remove();
            });
        });
    }

    this.mostrarMensaje = function(msg) {
                // Mostrar un bonito panel de bienvenida centrado
                const html = `
                    <div class="d-flex justify-content-center mt-4">
                        <div class="card w-75 shadow-sm">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <h4 class="card-title mb-2">Bienvenido</h4>
                                </div>
                                <p class="card-text lead text-muted mb-0">${msg}</p>
                            </div>
                        </div>
                    </div>`;
                $("#au").html(html);
                this.mostrarSalir();
    };

    this.comprobarSesion = function () {
        // Sprint 2: comprobar almacenamiento local del estado (localStorage)
        let nickLS = undefined;
        try { nickLS = localStorage.getItem('nick'); } catch(_) {}
        const nickCookie = $.cookie("nick");
        const nick = nickLS || nickCookie;
        if (nick) {
            cw.mostrarMensaje("Bienvenido al sistema, " + nick);
        }
        else {
            cw.mostrarRegistro();
        }
    }

    this.salir=function(){ 
        // Delegar en REST para cerrar sesión de servidor y limpiar estado local
        if (typeof rest === 'undefined') {
            window.rest = new ClienteRest();
        }
        rest.cerrarSesion();
    }

    // Dibuja un botón de salir para limpiar la sesión manualmente
    this.mostrarSalir = function(){
        if (document.getElementById('btnSalir')) return;
        // Colocar el botón de salir en la esquina superior izquierda del contenedor de mensajes
        const btn = '<div id="bnv" class="mb-2"><button id="btnSalir" class="btn btn-sm btn-outline-dark">Salir</button></div>';
        // Si hay un área de mensajes, insertar el botón antes del primer child para mostrarlo encima
        if ($('#au').children().length) {
            $('#au').prepend(btn);
        } else {
            $('#au').html(btn);
        }
        $("#btnSalir").on('click', ()=> this.salir());
    }
    
    this.mostrarRegistro=function(){ 
        $("#fmRegistro").remove(); 
        $("#registro").load("./cliente/registro.html",function(){ 
            $("#btnRegistro").on("click",function(e){ 
                e.preventDefault(); 
                let email=$("#email").val(); 
                let pwd=$("#pwd").val(); 
                if (email && pwd){ 
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
            '    <pre id="opsResult" style="white-space:pre-wrap;"></pre>' +
            '  </div>' +
            '</div>';

        $("#au").append(ops);

        // Handlers
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


    window.ControlWeb = ControlWeb;
}