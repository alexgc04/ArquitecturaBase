function ControlWeb() {

    // ==========================================
    // STRIKE COMMAND: Dominio Total
    // Control de la interfaz web del juego
    // ==========================================

    this.mostrarModal = function (m) {
        $("#msgModal").remove();
        let cadena = "<div id='msgModal'>" + m + "</div>";
        $('#mBody').empty().append(cadena);
        $('#miModal').modal();
    }

    this.registrarUsuario = function (email, password) {
        $.ajax({
            type: 'POST',
            url: '/registrarUsuario',
            data: JSON.stringify({ "email": email, "password": password }),
            success: function (data) {
                if (data.nick != -1) {
                    console.log("Usuario " + data.nick + " ha sido registrado");
                    cw.mostrarMensaje('¡Registro completado! Inicia sesión para jugar.');
                    cw.mostrarLogin();
                } else {
                    console.log("El nick está ocupado");
                    cw.mostrarMensaje('Error: ya existe un usuario con ese email.');
                }
            },
            error: function (xhr, textStatus, errorThrown) { 
                console.log("Status: " + textStatus); 
                console.log("Error: " + errorThrown); 
            }, 
            contentType: 'application/json'
        });
    }

    // Mostrar formulario de inicio de sesión con estilo del juego
    this.mostrarLogin = function () {
        if ($.cookie('nick')) {
            return true;
        }
        this.limpiar();
        
        const loginForm = `
            <div id="fmLogin" class="game-form-container">
                <h3>🎖️ Iniciar Sesión</h3>
                <form>
                    <div class="form-group">
                        <label for="email">Email de combate:</label>
                        <input type="email" class="form-control" placeholder="tu@email.com" id="email">
                    </div>
                    <div class="form-group">
                        <label for="pwd">Contraseña:</label>
                        <input type="password" class="form-control" placeholder="••••••••" id="pwd">
                    </div>
                    <button type="submit" id="btnLogin" class="btn btn-primary">⚔️ Entrar al Combate</button>
                </form>
                <div class="form-links">
                    <p>¿No tienes cuenta? <a href="#" id="linkRegistro">Regístrate aquí</a></p>
                </div>
            </div>
        `;
        
        $("#registro").html(loginForm);
        
        $("#btnLogin").on("click", function(e) {
            e.preventDefault();
            let email = $("#email").val();
            let pwd = $("#pwd").val();
            if (email && pwd) {
                rest.loginUsuario(email, pwd);
            } else {
                cw.mostrarMensaje('Introduce email y contraseña.');
            }
        });
        
        $("#linkRegistro").on("click", function(e) {
            e.preventDefault();
            cw.mostrarRegistro();
        });
    }

    this.mostrarMensajeLogin = function (msg) {
        this.mostrarMensaje(msg);
    }

    this.mostrarMensaje = function (msg) {
        if ($('#msgContainer').length === 0) {
            $('body').append('<div id="msgContainer" style="position: fixed; top: 70px; right: 20px; z-index: 9999; width: 350px;"></div>');
        }
        
        const id = 'msg-' + Date.now();
        const html = `
            <div id="${id}" class="toast show" role="alert" style="background: rgba(13, 27, 42, 0.95); border: 1px solid rgba(255,215,0,0.3);">
                <div class="toast-header" style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000;">
                    <strong class="mr-auto">⚔️ Strike Command</strong>
                    <small>Ahora</small>
                    <button type="button" class="ml-2 mb-1 close" onclick="$('#${id}').remove()">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="toast-body" style="color: #E0E0E0;">
                    ${msg}
                </div>
            </div>`;
            
        $('#msgContainer').append(html);
        
        setTimeout(function() {
            $(`#${id}`).fadeOut(500, function() { $(this).remove(); });
        }, 5000);
    };

    this.comprobarSesion = function () {
        if (typeof rest === 'undefined') { window.rest = new ClienteRest(); }
        $.getJSON('/ok')
            .done(function (data) {
                const nick = data && data.nick;
                if (nick && nick !== -1 && nick !== '-1') {
                    $.cookie('nick', nick);
                    if (typeof ws !== 'undefined') ws.email = nick;
                    cw.mostrarBarraUsuario(nick);
                    cw.mostrarMenuPrincipal();
                } else {
                    $.removeCookie('nick');
                    cw.ocultarBarraUsuario();
                    cw.mostrarLogin();
                }
            })
            .fail(function () {
                $.removeCookie('nick');
                cw.ocultarBarraUsuario();
                cw.mostrarLogin();
            });
    }

    this.salir = function () {
        if (typeof rest === 'undefined') {
            window.rest = new ClienteRest();
        }
        rest.cerrarSesion();
    }

    // Mostrar barra de usuario conectado
    this.mostrarBarraUsuario = function(nick) {
        const inicial = nick.charAt(0).toUpperCase();
        $('#userAvatar').text(inicial);
        $('#userName').text(nick);
        $('#userBar').fadeIn();
        // Ocultar Google One Tap cuando está logueado
        $('#googleSigninContainer').hide();
    }

    this.ocultarBarraUsuario = function() {
        $('#userBar').hide();
        // Mostrar Google One Tap cuando no está logueado
        $('#googleSigninContainer').show();
    }

    this.limpiar = function () {
        try { $('#au').empty(); } catch (_) {}
        try { $('#registro').empty(); } catch (_) {}
    }

    this.mostrarRegistro = function () {
        this.limpiar();
        
        const registroForm = `
            <div id="fmRegistro" class="game-form-container">
                <h3>🎖️ Registro de Comandante</h3>
                <form>
                    <div class="form-group">
                        <label for="apellidos">Apellidos:</label>
                        <input type="text" class="form-control" placeholder="Tus apellidos" id="apellidos">
                    </div>
                    <div class="form-group">
                        <label for="nombre">Nombre:</label>
                        <input type="text" class="form-control" placeholder="Tu nombre" id="nombre">
                    </div>
                    <div class="form-group">
                        <label for="email">Email de combate:</label>
                        <input type="email" class="form-control" placeholder="tu@email.com" id="email">
                    </div>
                    <div class="form-group">
                        <label for="pwd">Contraseña:</label>
                        <input type="password" class="form-control" placeholder="Mínimo 6 caracteres" id="pwd">
                    </div>
                    <button type="button" id="btnRegistro" class="btn btn-primary">🚀 Unirse a la Batalla</button>
                </form>
                <div class="form-links">
                    <p>¿Ya tienes cuenta? <a href="#" id="linkLogin">Inicia sesión</a></p>
                </div>
            </div>
        `;
        
        $("#registro").html(registroForm);
        
        $("#btnRegistro").on("click", function(e) {
            e.preventDefault();
            let email = $("#email").val();
            let pwd = $("#pwd").val();
            if (email && pwd) {
                cw.registrarUsuario(email, pwd);
            } else {
                cw.mostrarMensaje('Rellena email y contraseña.');
            }
        });
        
        $("#linkLogin").on("click", function(e) {
            e.preventDefault();
            cw.mostrarLogin();
        });
    }

    // ==========================================
    // MENÚ PRINCIPAL DEL JUEGO
    // ==========================================
    
    this.mostrarMenuPrincipal = function () {
        this.limpiar();
        
        const menu = `
            <div class="main-menu" id="mainMenu">
                <button class="menu-btn btn-singleplayer" id="btnUnJugador">
                    🤖 Un Jugador
                </button>
                <button class="menu-btn btn-multiplayer" id="btnMultijugador">
                    👥 Multijugador
                </button>
                <button class="menu-btn btn-config" id="btnConfiguracion">
                    ⚙️ Configuración
                </button>
                <button class="menu-btn btn-exit" id="btnSalir">
                    🚪 Salir
                </button>
            </div>
        `;
        
        $("#au").html(menu);
        
        // Handlers de los botones
        $("#btnUnJugador").on("click", function() {
            cw.mostrarPanelUnJugador();
        });
        
        $("#btnMultijugador").on("click", function() {
            cw.mostrarPanelMultijugador();
        });
        
        $("#btnConfiguracion").on("click", function() {
            cw.mostrarModal("⚙️ Configuración en desarrollo. ¡Próximamente!");
        });
        
        $("#btnSalir").on("click", function() {
            cw.salir();
        });
    }

    // ==========================================
    // PANEL UN JUGADOR (VS IA)
    // ==========================================
    
    this.mostrarPanelUnJugador = function() {
        this.limpiar();
        
        const panel = `
            <div class="game-panel" id="singlePlayerPanel">
                <div class="panel-header">
                    <h2 class="panel-title">🤖 Un Jugador</h2>
                    <button class="btn-back" id="btnVolverMenu">← Volver</button>
                </div>
                
                <div class="difficulty-section">
                    <p style="color: var(--color-plata); margin-bottom: 10px;">Selecciona la dificultad de tu oponente:</p>
                    
                    <div class="difficulty-grid">
                        <button class="difficulty-btn diff-beginner" data-difficulty="beginner">
                            <span class="diff-name">🌱 Principiante</span>
                            <span class="diff-desc">IA básica, ideal para aprender</span>
                        </button>
                        <button class="difficulty-btn diff-amateur" data-difficulty="amateur">
                            <span class="diff-name">⭐ Amateur</span>
                            <span class="diff-desc">Desafío moderado</span>
                        </button>
                        <button class="difficulty-btn diff-professional" data-difficulty="professional">
                            <span class="diff-name">🏆 Profesional</span>
                            <span class="diff-desc">Oponente inteligente</span>
                        </button>
                        <button class="difficulty-btn diff-legend" data-difficulty="legend">
                            <span class="diff-name">👑 Leyenda</span>
                            <span class="diff-desc">¿Te atreves?</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        $("#btnVolverMenu").on("click", function() {
            cw.mostrarMenuPrincipal();
        });
        
        $(".difficulty-btn").on("click", function() {
            const difficulty = $(this).data("difficulty");
            cw.iniciarPartidaIA(difficulty);
        });
    }

    this.iniciarPartidaIA = function(difficulty) {
        const diffNames = {
            'beginner': 'Principiante',
            'amateur': 'Amateur', 
            'professional': 'Profesional',
            'legend': 'Leyenda'
        };
        
        this.mostrarMensaje(`🎮 Iniciando partida contra IA ${diffNames[difficulty]}...`);
        
        // Guardar la dificultad seleccionada
        this.aiDifficulty = difficulty;
        
        // Mostrar pantalla de preparación (se implementará la lógica del juego después)
        this.mostrarPreparacionPartida('ia', difficulty);
    }

    // ==========================================
    // PANEL MULTIJUGADOR
    // ==========================================
    
    this.mostrarPanelMultijugador = function() {
        this.limpiar();
        
        const panel = `
            <div class="game-panel" id="multiplayerPanel">
                <div class="panel-header">
                    <h2 class="panel-title">👥 Multijugador</h2>
                    <button class="btn-back" id="btnVolverMenu">← Volver</button>
                </div>
                
                <!-- Sección de Amigos -->
                <div class="friends-section">
                    <h4 class="section-title">👤 Amigos</h4>
                    <div class="friend-input-group">
                        <input type="text" class="game-input" id="inputBuscarAmigo" placeholder="Buscar usuario por nick...">
                        <button class="btn-action btn-add" id="btnAgregarAmigo">+ Añadir</button>
                    </div>
                    <div class="friends-list" id="listaAmigos">
                        <p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">
                            No tienes amigos agregados aún
                        </p>
                    </div>
                </div>
                
                <!-- Sección de Partidas -->
                <div class="matches-section">
                    <h4 class="section-title">🎮 Partidas</h4>
                    
                    <div class="match-actions">
                        <button class="btn-create-match" id="btnCrearPartida">
                            ⚔️ Crear Nueva Partida
                        </button>
                    </div>
                    
                    <div class="join-match-group">
                        <input type="text" class="game-input" id="codigoPartida" placeholder="Código de partida...">
                        <button class="btn-action btn-join" id="btnUnirPartida">Unirse</button>
                    </div>
                    
                    <h5 class="section-title" style="margin-top: 20px;">📋 Partidas Disponibles</h5>
                    <div class="matches-list" id="listaPartidas">
                        <p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">
                            Buscando partidas...
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        // Handlers
        $("#btnVolverMenu").on("click", function() {
            cw.mostrarMenuPrincipal();
        });
        
        $("#btnCrearPartida").on("click", function() {
            let nick = $.cookie("nick");
            if (nick) {
                ws.crearPartida();
            } else {
                cw.mostrarModal("Debes iniciar sesión para crear una partida.");
            }
        });
        
        $("#btnUnirPartida").on("click", function() {
            let nick = $.cookie("nick");
            let codigo = $("#codigoPartida").val();
            if (nick && codigo) {
                ws.unirAPartida(codigo);
            } else {
                cw.mostrarModal("Introduce un código de partida válido.");
            }
        });
        
        $("#btnAgregarAmigo").on("click", function() {
            const nick = $("#inputBuscarAmigo").val();
            if (nick) {
                cw.agregarAmigo(nick);
            } else {
                cw.mostrarMensaje("Introduce un nick para buscar.");
            }
        });
        
        // Solicitar lista de partidas
        if (ws && ws.socket) {
            ws.socket.emit("obtenerPartidas");
        }
    }

    // ==========================================
    // GESTIÓN DE AMIGOS
    // ==========================================
    
    this.amigos = [];
    
    this.agregarAmigo = function(nick) {
        // Verificar si el usuario existe
        $.getJSON('/usuarioActivo/' + encodeURIComponent(nick), function(data) {
            if (data && data.activo) {
                if (!cw.amigos.includes(nick)) {
                    cw.amigos.push(nick);
                    cw.actualizarListaAmigos();
                    cw.mostrarMensaje(`✅ ${nick} añadido a tu lista de amigos`);
                    $("#inputBuscarAmigo").val('');
                } else {
                    cw.mostrarMensaje("Este usuario ya está en tu lista de amigos.");
                }
            } else {
                cw.mostrarMensaje("Usuario no encontrado o no activo.");
            }
        }).fail(function() {
            cw.mostrarMensaje("Error al buscar usuario.");
        });
    }
    
    this.eliminarAmigo = function(nick) {
        cw.amigos = cw.amigos.filter(a => a !== nick);
        cw.actualizarListaAmigos();
        cw.mostrarMensaje(`${nick} eliminado de tu lista de amigos`);
    }
    
    this.actualizarListaAmigos = function() {
        const container = $("#listaAmigos");
        
        if (this.amigos.length === 0) {
            container.html('<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No tienes amigos agregados aún</p>');
            return;
        }
        
        let html = '';
        this.amigos.forEach(function(amigo) {
            html += `
                <div class="friend-item">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="friend-status"></div>
                        <span class="friend-name">${amigo}</span>
                    </div>
                    <button class="btn-remove" onclick="cw.eliminarAmigo('${amigo}')">Eliminar</button>
                </div>
            `;
        });
        
        container.html(html);
    }

    // ==========================================
    // LISTA DE PARTIDAS (MULTIJUGADOR)
    // ==========================================
    
    this.mostrarListaPartidas = function (lista) {
        const container = $("#listaPartidas");
        
        if (!lista || lista.length === 0) {
            container.html('<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No hay partidas disponibles</p>');
            return;
        }
        
        let html = '';
        lista.forEach(function(partida) {
            html += `
                <div class="match-item">
                    <div class="match-info">
                        <span class="match-code">🎮 ${partida.codigo}</span>
                        <span class="match-host">Creador: ${partida.email}</span>
                    </div>
                    <button class="btn-join-match" onclick="ws.unirAPartida('${partida.codigo}')">Unirse</button>
                </div>
            `;
        });
        
        container.html(html);
    }

    // ==========================================
    // PANTALLA DE ESPERA
    // ==========================================
    
    this.mostrarEsperandoRival = function() {
        this.limpiar();
        
        const waiting = `
            <div class="game-panel">
                <div class="waiting-screen">
                    <h3 class="waiting-title">⏳ Esperando Rival...</h3>
                    <div class="spinner"></div>
                    <div class="waiting-code">${ws.codigo || '???'}</div>
                    <p style="color: var(--color-plata);">Comparte este código con tu rival</p>
                    <button class="menu-btn btn-exit" id="btnCancelarPartida" style="margin-top: 20px; padding: 12px 30px;">
                        ❌ Cancelar Partida
                    </button>
                </div>
            </div>
        `;
        
        $("#au").html(waiting);
        
        $("#btnCancelarPartida").on("click", function() {
            ws.salirPartida();
            cw.mostrarPanelMultijugador();
        });
    }

    // ==========================================
    // PREPARACIÓN DE PARTIDA (placeholder)
    // ==========================================
    
    this.mostrarPreparacionPartida = function(modo, dificultad) {
        this.limpiar();
        
        let titulo = modo === 'ia' ? `🤖 vs IA (${dificultad})` : '👥 Multijugador';
        
        const prep = `
            <div class="game-panel">
                <div class="panel-header">
                    <h2 class="panel-title">${titulo}</h2>
                    <button class="btn-back" id="btnVolverPrep">← Volver</button>
                </div>
                <div style="text-align: center; padding: 40px;">
                    <h3 style="color: var(--color-oro);">🚢 ¡Partida Lista!</h3>
                    <p style="color: var(--color-plata); margin: 20px 0;">
                        El tablero de juego se implementará en el siguiente sprint.
                    </p>
                    <div class="domain-icons" style="margin: 30px 0;">
                        <div class="domain-icon air">✈️</div>
                        <div class="domain-icon sea">🚢</div>
                        <div class="domain-icon land">🎖️</div>
                    </div>
                    <p style="color: var(--color-texto);">
                        Prepárate para el combate en tierra, mar y aire
                    </p>
                </div>
            </div>
        `;
        
        $("#au").html(prep);
        
        $("#btnVolverPrep").on("click", function() {
            if (modo === 'ia') {
                cw.mostrarPanelUnJugador();
            } else {
                cw.mostrarPanelMultijugador();
            }
        });
    }

    // ==========================================
    // CALLBACKS DE WEBSOCKET
    // ==========================================
    
    // Se llama cuando un jugador se une a nuestra partida
    this.jugadorUnido = function(datos) {
        this.mostrarMensaje(`🎮 ¡${datos.email} se ha unido a tu partida!`);
        this.mostrarPreparacionPartida('multi', null);
    }
    
    // Se llama cuando nos unimos exitosamente a una partida
    this.unidoAPartida = function(datos) {
        this.mostrarMensaje(`✅ Te has unido a la partida ${datos.codigo}`);
        this.mostrarPreparacionPartida('multi', null);
    }

    window.ControlWeb = ControlWeb;
}
