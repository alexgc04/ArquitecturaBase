function ControlWeb() {

    // ==========================================
    // STRIKE COMMAND: Dominio Total
    // Control de la interfaz web del juego
    // ==========================================
    
    // Polyfill para roundRect (compatibilidad con navegadores antiguos)
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
            const radius = typeof radii === 'number' ? radii : (radii?.[0] || 0);
            this.beginPath();
            this.moveTo(x + radius, y);
            this.lineTo(x + width - radius, y);
            this.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.lineTo(x + width, y + height - radius);
            this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.lineTo(x + radius, y + height);
            this.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.lineTo(x, y + radius);
            this.quadraticCurveTo(x, y, x + radius, y);
            this.closePath();
            return this;
        };
    }

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
        this.removeDomainBackground();
        
        // Asegurar que el contenedor del juego esté visible
        $('.game-container').show();
        
        const loginForm = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-logo">⚔️</div>
                        <h2 class="auth-title">Strike Command</h2>
                        <p class="auth-subtitle">Dominio Total</p>
                    </div>
                    <div class="auth-body">
                        <h3 class="auth-form-title">🎖️ Iniciar Sesión</h3>
                        <form id="fmLogin">
                            <div class="auth-input-group">
                                <span class="auth-input-icon">📧</span>
                                <input type="email" class="auth-input" placeholder="Email de combate" id="email">
                            </div>
                            <div class="auth-input-group">
                                <span class="auth-input-icon">🔒</span>
                                <input type="password" class="auth-input" placeholder="Contraseña" id="pwd">
                            </div>
                            <button type="submit" id="btnLogin" class="auth-btn auth-btn-primary">
                                ⚔️ Entrar al Combate
                            </button>
                        </form>
                        <div class="auth-divider">
                            <span>o continúa con</span>
                        </div>
                        <div id="googleBtnContainer" class="google-auth-btn">
                        </div>
                        <div class="auth-footer">
                            <p>¿No tienes cuenta? <a href="#" id="linkRegistro" class="auth-link">Únete a la batalla</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $("#registro").html(loginForm);
        
        // Mover el botón de Google al contenedor
        const googleBtn = $('#googleSigninContainer .g_id_signin').clone();
        $('#googleBtnContainer').html(googleBtn);
        
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
            <div id="${id}" class="game-toast">
                <div class="toast-icon">⚔️</div>
                <div class="toast-content">
                    <div class="toast-title">Strike Command</div>
                    <div class="toast-message">${msg}</div>
                </div>
                <button class="toast-close" onclick="$('#${id}').remove()">×</button>
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
                    // Registrar email en WebSocket
                    if (typeof ws !== 'undefined') {
                        ws.email = nick;
                        if (ws.setEmail) ws.setEmail(nick);
                    }
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
        $('#profileInitial').text(inicial);
        $('#profileAvatarLarge').text(inicial);
        $('#profileName').text(nick);
        $('#profileIcon').fadeIn();
        $('#rankingPanel').fadeIn();
        $('#googleSigninContainer').hide();
        
        // Cargar progreso guardado
        this.cargarProgreso();
        
        // Inicializar jugador si es nuevo
        this.inicializarJugador();
        
        // Iniciar autoguardado
        this.iniciarAutoGuardado();
        
        // Actualizar stats del perfil
        this.actualizarPerfilStats();
        this.inicializarPanelRanking();
    }

    // Actualizar estadísticas del perfil
    this.actualizarPerfilStats = function() {
        const rangoInfo = this.getRangoInfo();
        const datos = this.datosJugador;
        
        // Recursos
        $('#statMonedas').text(datos.monedas);
        $('#statDiamantes').text(datos.diamantes);
        
        // Inicializar stats si no existen
        if (!datos.statsMulti) datos.statsMulti = { victorias: 0, derrotas: 0, empates: 0 };
        if (!datos.stats1P) datos.stats1P = { victorias: 0, derrotas: 0 };
        
        // Estadísticas MULTIJUGADOR
        const vicMulti = datos.statsMulti.victorias || 0;
        const derMulti = datos.statsMulti.derrotas || 0;
        const empMulti = datos.statsMulti.empates || 0;
        const totalMulti = vicMulti + derMulti + empMulti;
        const winrateMulti = totalMulti > 0 ? Math.round((vicMulti / totalMulti) * 100) : 0;
        
        $('#statVictoriasMulti').text(vicMulti);
        $('#statDerrotasMulti').text(derMulti);
        $('#statPartidasMulti').text(totalMulti);
        $('#statWinrateMulti').text(winrateMulti + '%');
        
        // Estadísticas 1 JUGADOR (vs IA)
        const vic1P = datos.stats1P.victorias || 0;
        const der1P = datos.stats1P.derrotas || 0;
        const total1P = vic1P + der1P;
        const winrate1P = total1P > 0 ? Math.round((vic1P / total1P) * 100) : 0;
        
        $('#statVictorias1P').text(vic1P);
        $('#statDerrotas1P').text(der1P);
        $('#statWinrate1P').text(winrate1P + '%');
        $('#statTotal1P').text(total1P);
        
        // Copas/Trofeos (solo de multijugador)
        $('#profileTrophies').text(datos.copas || 0);
        
        // Rango
        $('#rankShield').text(rangoInfo.emoji);
        $('#rankNameSmall').text(rangoInfo.nombreCompleto);
        
        // Nivel y XP
        const nivel = datos.nivel || 1;
        const xp = datos.xp || 0;
        const xpParaSiguienteNivel = nivel * 100;
        const porcentajeXP = Math.min((xp / xpParaSiguienteNivel) * 100, 100);
        
        $('#playerLevel').text(nivel);
        $('#playerXP').text(xp);
        $('#playerXPMax').text(xpParaSiguienteNivel);
        $('#xpFill').css('width', porcentajeXP + '%');
        
        // Actualizar también panel de ranking
        this.actualizarPanelRanking();
    }
    
    // Inicializar panel de clasificación
    this.inicializarPanelRanking = function() {
        const ligas = [
            { id: 'recluta', nombre: 'Recluta', emoji: '🎖️', subligas: ['I', 'II', 'III'], puntos: [0, 50, 100], desbloqueo: '🏔️ Tierra' },
            { id: 'soldado', nombre: 'Soldado', emoji: '⚔️', subligas: ['I', 'II', 'III'], puntos: [150, 200, 250], desbloqueo: null },
            { id: 'cabo', nombre: 'Cabo', emoji: '🛡️', subligas: ['I', 'II', 'III'], puntos: [300, 400, 500], desbloqueo: '🌊 Mar' },
            { id: 'sargento', nombre: 'Sargento', emoji: '🏅', subligas: ['I', 'II', 'III'], puntos: [600, 800, 1000], desbloqueo: null },
            { id: 'capitan', nombre: 'Capitán', emoji: '⭐', subligas: ['I', 'II', 'III'], puntos: [1200, 1500, 2000], desbloqueo: null },
            { id: 'comandante', nombre: 'Comandante', emoji: '💎', subligas: ['I', 'II', 'III'], puntos: [2500, 3500, 5000], desbloqueo: '☁️ Aire' },
            { id: 'coronel', nombre: 'Coronel', emoji: '👑', subligas: ['I', 'II', 'III'], puntos: [7000, 10000, 15000], desbloqueo: null },
            { id: 'mariscal', nombre: 'Mariscal', emoji: '🔱', subligas: [], puntos: [20000], desbloqueo: null }
        ];
        
        let html = '';
        const rangoActual = this.getRangoInfo();
        const copasActuales = this.datosJugador.copas;
        
        ligas.forEach(liga => {
            // Ya no mostramos mensajes de desbloqueo de dominio
            // porque todos los dominios están desbloqueados desde el inicio
            
            if (liga.subligas.length > 0) {
                liga.subligas.forEach((sub, index) => {
                    const nombreCompleto = `${liga.nombre} ${sub}`;
                    const esCurrent = rangoActual.nombreCompleto === nombreCompleto;
                    html += `
                        <div class="ranking-item ${liga.id} ${esCurrent ? 'current' : ''}">
                            <div class="ranking-shield">${liga.emoji}</div>
                            <div class="ranking-info">
                                <span class="ranking-name">${nombreCompleto}</span>
                                <span class="ranking-points">🏆 ${liga.puntos[index]}+ copas</span>
                            </div>
                            ${esCurrent ? '<span style="color: var(--color-oro);">◄</span>' : ''}
                        </div>
                    `;
                });
            } else {
                const esCurrent = rangoActual.nombre === liga.nombre;
                html += `
                    <div class="ranking-item ${liga.id} ${esCurrent ? 'current' : ''}">
                        <div class="ranking-shield">${liga.emoji}</div>
                        <div class="ranking-info">
                            <span class="ranking-name">${liga.nombre}</span>
                            <span class="ranking-points">🏆 ${liga.puntos[0]}+ copas</span>
                        </div>
                        ${esCurrent ? '<span style="color: var(--color-oro);">◄</span>' : ''}
                    </div>
                `;
            }
        });
        
        $('#rankingList').html(html);
    }
    
    // Actualizar indicador de rango actual en panel
    this.actualizarPanelRanking = function() {
        const rangoActual = this.getRangoInfo();
        $('.ranking-item').removeClass('current');
        $('.ranking-item').each(function() {
            const nombre = $(this).find('.ranking-name').text();
            if (nombre === rangoActual.nombreCompleto || nombre === rangoActual.nombre) {
                $(this).addClass('current');
            }
        });
    }

    this.ocultarBarraUsuario = function() {
        $('#profileIcon').hide();
        $('#rankingPanel').hide();
        $('#googleSigninContainer').show();
    }

    this.limpiar = function () {
        try { $('#au').empty(); } catch (_) {}
        try { $('#registro').empty(); } catch (_) {}
    }

    this.mostrarRegistro = function () {
        this.limpiar();
        
        // Asegurar que el contenedor esté visible
        $('.game-container').show();
        
        const registroForm = `
            <div class="auth-container">
                <div class="auth-card">
                    <div class="auth-header">
                        <div class="auth-logo">🎖️</div>
                        <h2 class="auth-title">Strike Command</h2>
                        <p class="auth-subtitle">Registro de Comandante</p>
                    </div>
                    <div class="auth-body">
                        <form id="fmRegistro">
                            <div class="auth-input-group">
                                <span class="auth-input-icon">👤</span>
                                <input type="text" class="auth-input" placeholder="Nombre" id="nombre">
                            </div>
                            <div class="auth-input-group">
                                <span class="auth-input-icon">📧</span>
                                <input type="email" class="auth-input" placeholder="Email de combate" id="email">
                            </div>
                            <div class="auth-input-group">
                                <span class="auth-input-icon">🔒</span>
                                <input type="password" class="auth-input" placeholder="Contraseña" id="pwd">
                            </div>
                            <button type="button" id="btnRegistro" class="auth-btn auth-btn-primary">
                                🚀 Unirse a la Batalla
                            </button>
                        </form>
                        <div class="auth-footer">
                            <p>¿Ya tienes cuenta? <a href="#" id="linkLogin" class="auth-link">Inicia sesión</a></p>
                        </div>
                    </div>
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
        this.removeDomainBackground();
        
        // Asegurar que el contenedor esté visible
        $('.game-container').show();
        
        // Actualizar rango según copas actuales
        this.actualizarRangoPorCopas();
        
        const rangoInfo = this.getRangoInfo();
        const tierraDesbloqueado = this.dominioDesbloqueado('tierra');
        const marDesbloqueado = this.dominioDesbloqueado('mar');
        const aireDesbloqueado = this.dominioDesbloqueado('aire');
        
        // Escudos por rango (más visuales)
        const escudosRango = {
            'recluta': `<div class="escudo-rango escudo-recluta">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">🎖️</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`,
            'soldado': `<div class="escudo-rango escudo-soldado">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">🪖</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`,
            'cabo': `<div class="escudo-rango escudo-cabo">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">⭐</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`,
            'sargento': `<div class="escudo-rango escudo-sargento">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">⭐⭐</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`,
            'capitan': `<div class="escudo-rango escudo-capitan">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">🏅</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`,
            'comandante': `<div class="escudo-rango escudo-comandante">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">🦅</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`,
            'coronel': `<div class="escudo-rango escudo-coronel">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">👑</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`,
            'mariscal': `<div class="escudo-rango escudo-mariscal">
                <div class="escudo-borde"></div>
                <div class="escudo-centro">🌟</div>
                <div class="escudo-cinta">${rangoInfo.liga}</div>
            </div>`
        };
        
        const escudoHTML = escudosRango[rangoInfo.id] || escudosRango['recluta'];
        
        const menu = `
            <div class="main-menu" id="mainMenu">
                <div class="menu-rank-showcase">
                    ${escudoHTML}
                    <div class="rank-name-display">
                        <span class="rank-title">${rangoInfo.nombre}</span>
                        <span class="rank-liga-display">${rangoInfo.liga}</span>
                    </div>
                    <div class="rank-xp-display">
                        <div class="xp-bar-container">
                            <div class="xp-bar-fill" style="width: ${this.calcularProgresoCopas().porcentaje}%"></div>
                        </div>
                        <span class="xp-text">${this.datosJugador.copas || 0}/${this.calcularProgresoCopas().objetivo} 🏆</span>
                    </div>
                </div>
                
                <p class="menu-instruction">🎯 Selecciona un dominio de combate:</p>
                
                <button class="menu-btn btn-singleplayer" id="btnDominioTierraMenu">
                    🎖️ DOMINIO TERRESTRE
                </button>
                <button class="menu-btn btn-multiplayer" id="btnDominioMarMenu">
                    🚢 DOMINIO NAVAL
                </button>
                <button class="menu-btn btn-config" id="btnDominioAireMenu">
                    ✈️ DOMINIO AÉREO
                </button>
                <button class="menu-btn btn-exit" id="btnCerrarSesion">
                    🚪 Cerrar Sesión
                </button>
            </div>
        `;
        
        $("#au").html(menu);
        
        $("#btnDominioTierraMenu").on("click", function() {
            if (cw.dominioDesbloqueado('tierra')) {
                cw.mostrarMenuDominio('tierra');
            } else {
                cw.mostrarMensaje('🔒 Necesitas alcanzar el rango Recluta');
            }
        });
        
        $("#btnDominioMarMenu").on("click", function() {
            if (cw.dominioDesbloqueado('mar')) {
                cw.mostrarMenuDominio('mar');
            } else {
                cw.mostrarMensaje('🔒 Necesitas alcanzar el rango Cabo para desbloquear el Dominio Naval');
            }
        });
        
        $("#btnDominioAireMenu").on("click", function() {
            if (cw.dominioDesbloqueado('aire')) {
                cw.mostrarMenuDominio('aire');
            } else {
                cw.mostrarMensaje('🔒 Necesitas alcanzar el rango Comandante para desbloquear el Dominio Aéreo');
            }
        });
        
        $("#btnCerrarSesion").on("click", function() {
            cw.salir();
        });
    }

    // ==========================================
    // SISTEMA DE DATOS DEL JUEGO
    // ==========================================

    // Sistema de Rangos con puntos y Ligas con copas
    this.sistemRangos = {
        rangos: [
            { id: 'recluta', nombre: 'Recluta', emoji: '🎖️', escudo: '⚔️', desbloquea: 'tierra', puntos: [0, 50, 100] },
            { id: 'soldado', nombre: 'Soldado', emoji: '🪖', escudo: '🛡️', desbloquea: null, puntos: [150, 200, 250] },
            { id: 'cabo', nombre: 'Cabo', emoji: '⭐', escudo: '🏅', desbloquea: 'mar', puntos: [300, 400, 500] },
            { id: 'sargento', nombre: 'Sargento', emoji: '⭐⭐', escudo: '🎗️', desbloquea: null, puntos: [800, 1200, 1800] },
            { id: 'capitan', nombre: 'Capitán', emoji: '🏅', escudo: '🦅', desbloquea: null, puntos: [2500, 3500, 4500] },
            { id: 'comandante', nombre: 'Comandante', emoji: '🎖️🎖️', escudo: '🦅', desbloquea: 'aire', puntos: [5500, 7000, 8500] },
            { id: 'coronel', nombre: 'Coronel', emoji: '👑', escudo: '🦅👑', desbloquea: null, puntos: [10000, 12500, 15000] },
            { id: 'mariscal', nombre: 'Mariscal', emoji: '🌟👑', escudo: '🏆', desbloquea: null, puntos: [20000] }
        ],
        // Sistema de Ligas basado en copas
        ligas: [
            { id: 'bronce', nombre: 'Liga Bronce', emoji: '🥉', copasMin: 0, copasMax: 199, recompensaSubir: 200, color: '#CD7F32' },
            { id: 'plata', nombre: 'Liga Plata', emoji: '🥈', copasMin: 200, copasMax: 499, recompensaSubir: 500, color: '#C0C0C0' },
            { id: 'oro', nombre: 'Liga Oro', emoji: '🥇', copasMin: 500, copasMax: 999, recompensaSubir: 1000, color: '#FFD700' },
            { id: 'platino', nombre: 'Liga Platino', emoji: '💎', copasMin: 1000, copasMax: 1999, recompensaSubir: 2000, color: '#E5E4E2' },
            { id: 'diamante', nombre: 'Liga Diamante', emoji: '💠', copasMin: 2000, copasMax: 3499, recompensaSubir: 3500, color: '#00CED1' },
            { id: 'maestro', nombre: 'Liga Maestro', emoji: '👑', copasMin: 3500, copasMax: 4999, recompensaSubir: 5000, color: '#9932CC' },
            { id: 'campeon', nombre: 'Liga Campeón', emoji: '🏆', copasMin: 5000, copasMax: 7499, recompensaSubir: 7500, color: '#FF4500' },
            { id: 'leyenda', nombre: 'Liga Leyenda', emoji: '🌟', copasMin: 7500, copasMax: 999999, recompensaSubir: 10000, color: '#FFD700' }
        ]
    };

    // Datos de unidades de ATAQUE con precios actualizados y Mítico
    // ESPACIO: Cuánto ocupa cada tropa (menor espacio = más tropas)
    // RANGO: Distancia de ataque de la tropa
    this.unidadesAtaque = {
        tierra: {
            nombre: "Terrestre",
            emoji: "🎖️",
            rangoRequerido: 0,
            tipoJuego: "shooter",
            tropas: [
                // ==========================================
                // 🔥 TANQUES ELEMENTALES - 5 ÚNICOS
                // Cada uno con 3 armas básicas + super elemental
                // ==========================================
                
                // 1. TANQUE DE FUEGO 🔥
                {
                    id: "fire_tank",
                    nombre: "Inferno Tank",
                    emoji: "🔥",
                    rareza: "Común",
                    elemento: "fuego",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Tanque de fuego. Quema todo a su paso.",
                    stats: { vida: 1000, velocidad: 4, armadura: 10, dañoBonus: 1.0 },
                    armas: [
                        { id: "pistola", nombre: "Pistola", emoji: "🔫", tipo: "pistola", daño: 80, municion: -1 },
                        { id: "escopeta", nombre: "Escopeta", emoji: "💥", tipo: "escopeta", daño: 120, municion: 5, fragmentos: 5 },
                        { id: "metralleta", nombre: "Metralleta", emoji: "🔫", tipo: "metralleta", daño: 50, municion: 10 }
                    ],
                    superpoder: {
                        nombre: "Infierno",
                        emoji: "🌋",
                        descripcion: "Lanza una ola de fuego que quema el terreno",
                        daño: 250,
                        radio: 120,
                        quemaDaño: 50,
                        quemaTurnos: 3
                    }
                },
                
                // 2. TANQUE DE HIELO ❄️
                {
                    id: "ice_tank",
                    nombre: "Frost Tank",
                    emoji: "❄️",
                    rareza: "Común",
                    elemento: "hielo",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Tanque criogénico. Congela a los enemigos.",
                    stats: { vida: 900, velocidad: 3, armadura: 15, dañoBonus: 1.1 },
                    armas: [
                        { id: "pistola", nombre: "Pistola", emoji: "🔫", tipo: "pistola", daño: 85, municion: -1 },
                        { id: "escopeta", nombre: "Escopeta", emoji: "💥", tipo: "escopeta", daño: 130, municion: 5, fragmentos: 5 },
                        { id: "metralleta", nombre: "Metralleta", emoji: "🔫", tipo: "metralleta", daño: 55, municion: 10 }
                    ],
                    superpoder: {
                        nombre: "Ventisca",
                        emoji: "🌨️",
                        descripcion: "Congela al enemigo por 2 turnos",
                        daño: 200,
                        radio: 100,
                        congelaTurnos: 2
                    }
                },
                
                // 3. TANQUE DE TIERRA 🌍
                {
                    id: "earth_tank",
                    nombre: "Golem Tank",
                    emoji: "🪨",
                    rareza: "Común",
                    elemento: "tierra",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Tanque de roca. Máxima resistencia.",
                    stats: { vida: 1500, velocidad: 2, armadura: 25, dañoBonus: 0.8 },
                    armas: [
                        { id: "pistola", nombre: "Pistola", emoji: "🔫", tipo: "pistola", daño: 70, municion: -1 },
                        { id: "escopeta", nombre: "Escopeta", emoji: "💥", tipo: "escopeta", daño: 100, municion: 5, fragmentos: 5 },
                        { id: "metralleta", nombre: "Metralleta", emoji: "🔫", tipo: "metralleta", daño: 45, municion: 10 }
                    ],
                    superpoder: {
                        nombre: "Terremoto",
                        emoji: "💥",
                        descripcion: "Sacude el terreno causando daño masivo",
                        daño: 300,
                        radio: 150,
                        destruyeTerreno: true
                    }
                },
                
                // 4. TANQUE DE PLANTA 🌿
                {
                    id: "plant_tank",
                    nombre: "Nature Tank",
                    emoji: "🌿",
                    rareza: "Común",
                    elemento: "planta",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Tanque natural. Se regenera con el tiempo.",
                    stats: { vida: 1100, velocidad: 3, armadura: 8, regeneracion: 50, dañoBonus: 0.9 },
                    armas: [
                        { id: "pistola", nombre: "Pistola", emoji: "🔫", tipo: "pistola", daño: 75, municion: -1 },
                        { id: "escopeta", nombre: "Escopeta", emoji: "💥", tipo: "escopeta", daño: 110, municion: 5, fragmentos: 5 },
                        { id: "metralleta", nombre: "Metralleta", emoji: "🔫", tipo: "metralleta", daño: 48, municion: 10 }
                    ],
                    superpoder: {
                        nombre: "Enredadera",
                        emoji: "🌱",
                        descripcion: "Atrapa al enemigo e impide su movimiento",
                        daño: 180,
                        radio: 80,
                        inmovTurnos: 2,
                        curacion: 200
                    }
                },
                
                // 5. TANQUE DE RAYO ⚡ (Menos vida = más daño)
                {
                    id: "lightning_tank",
                    nombre: "Storm Tank",
                    emoji: "⚡",
                    rareza: "Común",
                    elemento: "rayo",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Tanque eléctrico. Menos vida pero daño extremo.",
                    stats: { vida: 850, velocidad: 6, armadura: 5, dañoBonus: 1.3 },
                    armas: [
                        { id: "pistola", nombre: "Pistola", emoji: "🔫", tipo: "pistola", daño: 100, municion: -1 },
                        { id: "escopeta", nombre: "Escopeta", emoji: "💥", tipo: "escopeta", daño: 150, municion: 5, fragmentos: 5 },
                        { id: "metralleta", nombre: "Metralleta", emoji: "🔫", tipo: "metralleta", daño: 65, municion: 10 }
                    ],
                    superpoder: {
                        nombre: "Rayo",
                        emoji: "⚡",
                        descripcion: "Lanza un rayo que impacta instantáneamente",
                        daño: 400,
                        radio: 40,
                        instantaneo: true
                    }
                }
            ]
        },
        mar: {
            nombre: "Naval",
            emoji: "🚢",
            rangoRequerido: 0, // Desbloqueado desde el inicio
            tipoJuego: "batallanaval",
            tropas: [
                // ==========================================
                // BATALLA NAVAL: 7 BARCOS (1-7 casillas)
                // Daño: amarillo → naranja → rojo (hundido)
                // Superpoderes: diferentes áreas de efecto
                // ==========================================
                
                // BARCO 1 CASILLA - Lancha Rápida
                {
                    id: "lancha",
                    nombre: "Lancha Rápida",
                    emoji: "🚤",
                    rareza: "Común",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Pequeña pero letal. Super: Disparo preciso 1x1",
                    casillas: 1,
                    vida: 1,
                    superpoder: {
                        nombre: "🎯 Disparo Preciso",
                        descripcion: "Disparo único garantizado",
                        area: "1x1",
                        hundeDirecto: true
                    }
                },
                
                // BARCO 2 CASILLAS - Patrullero
                {
                    id: "patrullero",
                    nombre: "Patrullero",
                    emoji: "🛥️",
                    rareza: "Común",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Rápida patrulla costera. Super: Línea de 2",
                    casillas: 2,
                    vida: 2,
                    superpoder: {
                        nombre: "💣 Disparo Doble",
                        descripcion: "Ataca 2 casillas en línea",
                        area: "1x2",
                        hundeDirecto: true
                    }
                },
                
                // BARCO 3 CASILLAS - Destructor
                {
                    id: "destructor",
                    nombre: "Destructor",
                    emoji: "🚢",
                    rareza: "Raro",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Destrucción garantizada. Super: Línea de 3",
                    casillas: 3,
                    vida: 3,
                    superpoder: {
                        nombre: "🌊 Torpedo Triple",
                        descripcion: "Ataca 3 casillas en línea",
                        area: "1x3",
                        hundeDirecto: true
                    }
                },
                
                // BARCO 4 CASILLAS - Crucero
                {
                    id: "crucero",
                    nombre: "Crucero",
                    emoji: "⛴️",
                    rareza: "Épico",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Potente crucero de guerra. Super: Área 2x2",
                    casillas: 4,
                    vida: 4,
                    superpoder: {
                        nombre: "🎯 Bombardeo",
                        descripcion: "Ataca área de 2x2",
                        area: "2x2",
                        hundeDirecto: true
                    }
                },
                
                // BARCO 5 CASILLAS - Acorazado
                {
                    id: "acorazado",
                    nombre: "Acorazado",
                    emoji: "🛳️",
                    rareza: "Épico",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Blindaje pesado y artillería. Super: Área 3x3",
                    casillas: 5,
                    vida: 5,
                    superpoder: {
                        nombre: "☄️ Misil Crucero",
                        descripcion: "Ataca área de 3x3",
                        area: "3x3",
                        hundeDirecto: true
                    }
                },
                
                // BARCO 6 CASILLAS - Portaaviones
                {
                    id: "portaaviones",
                    nombre: "Portaaviones",
                    emoji: "🚀",
                    rareza: "Mítico",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Base aérea móvil. Super: Área 4x4",
                    casillas: 6,
                    vida: 6,
                    superpoder: {
                        nombre: "✈️ Ataque Aéreo",
                        descripcion: "Ataca área de 4x4",
                        area: "4x4",
                        hundeDirecto: true
                    }
                },
                
                // BARCO 7 CASILLAS - Dreadnought
                {
                    id: "dreadnought",
                    nombre: "Dreadnought",
                    emoji: "⚓",
                    rareza: "Legendario",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "La nave más poderosa. Super: Área 5x5",
                    casillas: 7,
                    vida: 7,
                    superpoder: {
                        nombre: "💀 Aniquilación",
                        descripcion: "Ataca área masiva de 5x5",
                        area: "5x5",
                        hundeDirecto: true
                    }
                }
            ]
        },
        aire: {
            nombre: "Aéreo",
            emoji: "✈️",
            rangoRequerido: 0, // Desbloqueado desde el inicio
            tipoJuego: "spaceinvaders",
            tropas: [
                // ==========================================
                // SPACE INVADERS: AVIONES DISPONIBLES
                // Se mejoran con powerups durante la partida
                // Modo 1J: Niveles estilo Candy Crush
                // Modo Multi: 1v1 con oleadas
                // ==========================================
                {
                    id: "caza_espacial",
                    nombre: "Caza Espacial X-1",
                    emoji: "🛩️",
                    rareza: "Común",
                    precio: 0,
                    desbloqueado: true,
                    proximamente: false,
                    stats: {
                        vida: 3, // 3 vidas iniciales
                        velocidad: 6,
                        daño: 10
                    },
                    descripcion: "Tu nave espacial básica. Mejórala con powerups en combate."
                },
                {
                    id: "halcon_rojo",
                    nombre: "Halcón Rojo MK-II",
                    emoji: "🔴",
                    rareza: "Raro",
                    precio: 1500,
                    desbloqueado: false,
                    proximamente: true,
                    stats: {
                        vida: 4,
                        velocidad: 7,
                        daño: 15
                    },
                    descripcion: "Caza rápido con mayor cadencia de disparo."
                },
                {
                    id: "titan_blindado",
                    nombre: "Titán Blindado",
                    emoji: "🛡️",
                    rareza: "Raro",
                    precio: 2000,
                    desbloqueado: false,
                    proximamente: true,
                    stats: {
                        vida: 6,
                        velocidad: 4,
                        daño: 12
                    },
                    descripcion: "Nave pesada con escudo reforzado pero menor velocidad."
                },
                {
                    id: "espectro_nocturno",
                    nombre: "Espectro Nocturno",
                    emoji: "👻",
                    rareza: "Épico",
                    precio: 5000,
                    desbloqueado: false,
                    proximamente: true,
                    stats: {
                        vida: 3,
                        velocidad: 9,
                        daño: 18
                    },
                    descripcion: "Nave sigilosa ultra rápida. Difícil de alcanzar."
                },
                {
                    id: "destructor_cosmico",
                    nombre: "Destructor Cósmico",
                    emoji: "☄️",
                    rareza: "Épico",
                    precio: 8000,
                    desbloqueado: false,
                    proximamente: true,
                    stats: {
                        vida: 5,
                        velocidad: 5,
                        daño: 25
                    },
                    descripcion: "Alto poder de fuego. Destruye asteroides en 1 golpe."
                },
                {
                    id: "fenix_dorado",
                    nombre: "Fénix Dorado",
                    emoji: "🌟",
                    rareza: "Mítico",
                    precio: 15000,
                    desbloqueado: false,
                    proximamente: true,
                    stats: {
                        vida: 5,
                        velocidad: 8,
                        daño: 22
                    },
                    descripcion: "Puede resucitar una vez por partida. Leyenda espacial."
                },
                {
                    id: "nebula_supremo",
                    nombre: "Nebula Supremo",
                    emoji: "💜",
                    rareza: "Legendario",
                    precio: 30000,
                    desbloqueado: false,
                    proximamente: true,
                    stats: {
                        vida: 7,
                        velocidad: 8,
                        daño: 30
                    },
                    descripcion: "La nave más poderosa del universo. Dominio absoluto."
                }
            ],
            // Skins/Aspectos para cada tipo de avión
            skins: [
                {
                    id: "skin_clasico",
                    nombre: "Clásico",
                    emoji: "⚪",
                    precio: 0,
                    desbloqueado: true,
                    descripcion: "Aspecto original de fábrica.",
                    aplicaA: "todos"
                },
                {
                    id: "skin_fuego",
                    nombre: "Llamas de Guerra",
                    emoji: "🔥",
                    precio: 500,
                    desbloqueado: false,
                    descripcion: "Pintura con llamas ardientes en el fuselaje.",
                    aplicaA: "todos"
                },
                {
                    id: "skin_hielo",
                    nombre: "Escarcha Ártica",
                    emoji: "❄️",
                    precio: 500,
                    desbloqueado: false,
                    descripcion: "Diseño helado con tonos azules cristalinos.",
                    aplicaA: "todos"
                },
                {
                    id: "skin_camuflaje",
                    nombre: "Camuflaje Militar",
                    emoji: "🌿",
                    precio: 750,
                    desbloqueado: false,
                    descripcion: "Patrón militar para operaciones encubiertas.",
                    aplicaA: "todos"
                },
                {
                    id: "skin_neon",
                    nombre: "Neón Cyberpunk",
                    emoji: "💫",
                    precio: 1000,
                    desbloqueado: false,
                    descripcion: "Luces neón futuristas estilo cyberpunk.",
                    aplicaA: "todos"
                },
                {
                    id: "skin_dorado",
                    nombre: "Edición Dorada",
                    emoji: "🥇",
                    precio: 2500,
                    desbloqueado: false,
                    descripcion: "Recubrimiento dorado de lujo premium.",
                    aplicaA: "todos"
                },
                {
                    id: "skin_galaxia",
                    nombre: "Nebulosa Galáctica",
                    emoji: "🌌",
                    precio: 5000,
                    desbloqueado: false,
                    descripcion: "Pintado con estrellas y nebulosas espaciales.",
                    aplicaA: "todos"
                }
            ]
        }
    };

    // ==========================================
    // SISTEMA DE CUARTEL GENERAL (AYUNTAMIENTO)
    // ==========================================
    
    // Nombres de la base principal por dominio
    this.nombreBasePrincipal = {
        tierra: "Cuartel General",
        mar: "Puerto de Mando",
        aire: "Centro de Operaciones"
    };
    
    this.cuartelGeneral = {
        niveles: [
            { nivel: 1, vida: 1000, precio: 0, descripcion: "Base básica", maxDefensas: 3, maxMuros: 10 },
            { nivel: 2, vida: 1500, precio: 500, descripcion: "Base mejorada", maxDefensas: 5, maxMuros: 20 },
            { nivel: 3, vida: 2000, precio: 1500, descripcion: "Base fortificada", maxDefensas: 8, maxMuros: 35 },
            { nivel: 4, vida: 2800, precio: 4000, descripcion: "Fortaleza menor", maxDefensas: 12, maxMuros: 50 },
            { nivel: 5, vida: 3800, precio: 10000, descripcion: "Fortaleza mayor", maxDefensas: 16, maxMuros: 75 },
            { nivel: 6, vida: 5000, precio: 25000, descripcion: "Ciudadela", maxDefensas: 20, maxMuros: 100 },
            { nivel: 7, vida: 6500, precio: 50000, descripcion: "Bastión imperial", maxDefensas: 25, maxMuros: 130 },
            { nivel: 8, vida: 8500, precio: 100000, descripcion: "Fortaleza suprema", maxDefensas: 30, maxMuros: 175 },
            { nivel: 9, vida: 11000, precio: 200000, descripcion: "Comando central", maxDefensas: 35, maxMuros: 225 },
            { nivel: 10, vida: 15000, precio: 500000, descripcion: "Alto mando", maxDefensas: 40, maxMuros: 300 }
        ]
    };
    
    // ==========================================
    // SISTEMA DE DEFENSAS CON NIVELES
    // Comunes: 10 niveles, Raros: 5 niveles, Épicos: 3, Míticos: 2, Legendarios: 1
    // RANGO: Distancia a la que pueden disparar (píxeles)
    // ==========================================
    
    // Función para generar estadísticas por nivel
    this.generarNivelesDefensa = function(baseVida, baseDPS, maxNivel, multiplicador = 1.15) {
        const niveles = [];
        for (let i = 1; i <= maxNivel; i++) {
            const mult = Math.pow(multiplicador, i - 1);
            niveles.push({
                nivel: i,
                vida: Math.floor(baseVida * mult),
                dps: Math.floor(baseDPS * mult),
                precioMejora: i === 1 ? 0 : Math.floor(100 * Math.pow(2, i - 1))
            });
        }
        return niveles;
    };
    
    // Datos de DEFENSAS con sistema de niveles estilo Clash of Clans
    this.defensas = {
        tierra: {
            nombre: "Terrestre",
            rangoRequerido: 0,
            estructuras: [
                // COMUNES - 10 niveles (defensas básicas)
                { 
                    id: "canon", 
                    nombre: "Cañón", 
                    emoji: "💣", 
                    icono: "cannon",
                    imagen: "🔵",
                    precio: 0, 
                    precioDiamantes: 0, 
                    rareza: "Común", 
                    maxNivel: 10,
                    rango: 80, // Distancia de disparo
                    niveles: [
                        { nivel: 1, vida: 420, dps: 9, precioMejora: 0 },
                        { nivel: 2, vida: 470, dps: 11, precioMejora: 100 },
                        { nivel: 3, vida: 520, dps: 15, precioMejora: 250 },
                        { nivel: 4, vida: 570, dps: 19, precioMejora: 500 },
                        { nivel: 5, vida: 620, dps: 25, precioMejora: 1000 },
                        { nivel: 6, vida: 680, dps: 31, precioMejora: 2000 },
                        { nivel: 7, vida: 750, dps: 40, precioMejora: 4000 },
                        { nivel: 8, vida: 850, dps: 48, precioMejora: 8000 },
                        { nivel: 9, vida: 960, dps: 56, precioMejora: 16000 },
                        { nivel: 10, vida: 1100, dps: 65, precioMejora: 32000 }
                    ],
                    descripcion: "Defensa básica de proyectil único" 
                },
                { 
                    id: "mina", 
                    nombre: "Mina Terrestre", 
                    emoji: "💥", 
                    icono: "mine",
                    imagen: "🟤",
                    precio: 150, 
                    precioDiamantes: 0, 
                    rareza: "Común", 
                    maxNivel: 10,
                    rango: 20,
                    niveles: [
                        { nivel: 1, vida: 0, dps: 50, precioMejora: 0 },
                        { nivel: 2, vida: 0, dps: 65, precioMejora: 80 },
                        { nivel: 3, vida: 0, dps: 85, precioMejora: 200 },
                        { nivel: 4, vida: 0, dps: 110, precioMejora: 400 },
                        { nivel: 5, vida: 0, dps: 140, precioMejora: 800 },
                        { nivel: 6, vida: 0, dps: 180, precioMejora: 1500 },
                        { nivel: 7, vida: 0, dps: 230, precioMejora: 3000 },
                        { nivel: 8, vida: 0, dps: 290, precioMejora: 6000 },
                        { nivel: 9, vida: 0, dps: 360, precioMejora: 12000 },
                        { nivel: 10, vida: 0, dps: 450, precioMejora: 25000 }
                    ],
                    descripcion: "Trampa explosiva oculta, daño único" 
                },
                { 
                    id: "torre_francotirador", 
                    nombre: "Torre Francotirador", 
                    emoji: "🎯", 
                    icono: "sniper-tower",
                    imagen: "🏗️",
                    precio: 350, 
                    precioDiamantes: 0, 
                    rareza: "Común", 
                    maxNivel: 10,
                    rango: 150,
                    niveles: [
                        { nivel: 1, vida: 380, dps: 15, precioMejora: 0 },
                        { nivel: 2, vida: 420, dps: 20, precioMejora: 120 },
                        { nivel: 3, vida: 470, dps: 27, precioMejora: 300 },
                        { nivel: 4, vida: 520, dps: 35, precioMejora: 600 },
                        { nivel: 5, vida: 580, dps: 45, precioMejora: 1200 },
                        { nivel: 6, vida: 650, dps: 55, precioMejora: 2500 },
                        { nivel: 7, vida: 730, dps: 68, precioMejora: 5000 },
                        { nivel: 8, vida: 820, dps: 82, precioMejora: 10000 },
                        { nivel: 9, vida: 920, dps: 98, precioMejora: 20000 },
                        { nivel: 10, vida: 1050, dps: 120, precioMejora: 40000 }
                    ],
                    descripcion: "Alto daño a objetivos únicos, largo alcance" 
                },
                // RAROS - 5 niveles
                { 
                    id: "torre_centinela", 
                    nombre: "Torre Centinela", 
                    emoji: "🗼", 
                    icono: "sentry-tower",
                    imagen: "🔴",
                    precio: 800, 
                    precioDiamantes: 0, 
                    rareza: "Raro", 
                    maxNivel: 5,
                    rango: 100,
                    niveles: [
                        { nivel: 1, vida: 600, dps: 35, precioMejora: 0 },
                        { nivel: 2, vida: 720, dps: 48, precioMejora: 2000 },
                        { nivel: 3, vida: 860, dps: 65, precioMejora: 5000 },
                        { nivel: 4, vida: 1030, dps: 88, precioMejora: 12000 },
                        { nivel: 5, vida: 1250, dps: 120, precioMejora: 30000 }
                    ],
                    descripcion: "Disparo rápido, detecta camuflaje" 
                },
                { 
                    id: "mortero", 
                    nombre: "Mortero", 
                    emoji: "🎇", 
                    icono: "mortar",
                    imagen: "⚫",
                    precio: 1200, 
                    precioDiamantes: 0, 
                    rareza: "Raro", 
                    maxNivel: 5,
                    rango: 120,
                    niveles: [
                        { nivel: 1, vida: 450, dps: 20, precioMejora: 0 },
                        { nivel: 2, vida: 540, dps: 28, precioMejora: 2500 },
                        { nivel: 3, vida: 650, dps: 40, precioMejora: 6000 },
                        { nivel: 4, vida: 780, dps: 55, precioMejora: 15000 },
                        { nivel: 5, vida: 950, dps: 75, precioMejora: 35000 }
                    ],
                    descripcion: "Daño en área, ataque lento pero devastador" 
                },
                // ÉPICOS - 3 niveles
                { 
                    id: "misiles_terrestres", 
                    nombre: "Lanzamisiles", 
                    emoji: "🚀", 
                    icono: "missile-launcher",
                    imagen: "🟢",
                    precio: 3000, 
                    precioDiamantes: 0, 
                    rareza: "Épico", 
                    maxNivel: 3,
                    rango: 140,
                    niveles: [
                        { nivel: 1, vida: 800, dps: 70, precioMejora: 0 },
                        { nivel: 2, vida: 1050, dps: 100, precioMejora: 15000 },
                        { nivel: 3, vida: 1400, dps: 140, precioMejora: 50000 }
                    ],
                    descripcion: "Misiles teledirigidos de alto daño" 
                },
                { 
                    id: "bunker", 
                    nombre: "Búnker Blindado", 
                    emoji: "🏰", 
                    icono: "bunker",
                    imagen: "🟫",
                    precio: 5000, 
                    precioDiamantes: 0, 
                    rareza: "Épico", 
                    maxNivel: 3,
                    rango: 70,
                    niveles: [
                        { nivel: 1, vida: 1500, dps: 50, precioMejora: 0 },
                        { nivel: 2, vida: 2000, dps: 75, precioMejora: 20000 },
                        { nivel: 3, vida: 2800, dps: 110, precioMejora: 60000 }
                    ],
                    descripcion: "Fortificación masiva con tropas dentro" 
                },
                // MÍTICOS - 2 niveles
                { 
                    id: "railgun", 
                    nombre: "Cañón de Riel", 
                    emoji: "⚡", 
                    icono: "railgun",
                    imagen: "🔵",
                    precio: 15000, 
                    precioDiamantes: 50, 
                    rareza: "Mítico", 
                    maxNivel: 2,
                    rango: 180,
                    niveles: [
                        { nivel: 1, vida: 1200, dps: 150, precioMejora: 0 },
                        { nivel: 2, vida: 1800, dps: 250, precioMejora: 100000 }
                    ],
                    descripcion: "Rayo electromagnético perforante" 
                },
                // LEGENDARIOS - 1 nivel
                { 
                    id: "obelisco", 
                    nombre: "Obelisco del Destino", 
                    emoji: "🗿", 
                    icono: "obelisk",
                    imagen: "⚪",
                    precio: 50000, 
                    precioDiamantes: 150, 
                    rareza: "Legendario", 
                    maxNivel: 1,
                    rango: 200,
                    niveles: [
                        { nivel: 1, vida: 2500, dps: 300, precioMejora: 0 }
                    ],
                    descripcion: "Defensa legendaria definitiva" 
                }
            ],
            // MUROS - Sistema separado, 10 niveles
            muros: {
                id: "muro",
                nombre: "Muro",
                maxNivel: 10,
                niveles: [
                    { nivel: 1, vida: 300, emoji: "🪵", precio: 50 },
                    { nivel: 2, vida: 500, emoji: "🧱", precio: 150 },
                    { nivel: 3, vida: 750, emoji: "🧱", precio: 400 },
                    { nivel: 4, vida: 1000, emoji: "🪨", precio: 1000 },
                    { nivel: 5, vida: 1400, emoji: "🪨", precio: 2500 },
                    { nivel: 6, vida: 1900, emoji: "⬛", precio: 5000 },
                    { nivel: 7, vida: 2500, emoji: "⬛", precio: 10000 },
                    { nivel: 8, vida: 3200, emoji: "🟪", precio: 25000 },
                    { nivel: 9, vida: 4000, emoji: "🟪", precio: 50000 },
                    { nivel: 10, vida: 5000, emoji: "💎", precio: 100000 }
                ]
            }
        },
        mar: {
            nombre: "Naval",
            rangoRequerido: 2,
            estructuras: [
                // COMUNES - 10 niveles
                { id: "boya_minas", nombre: "Campo de Minas", emoji: "💣", icono: "minefield", precio: 0, precioDiamantes: 0, rareza: "Común", maxNivel: 10, rango: 25, niveles: [
                    { nivel: 1, vida: 0, dps: 60, precioMejora: 0 },
                    { nivel: 2, vida: 0, dps: 80, precioMejora: 100 },
                    { nivel: 3, vida: 0, dps: 105, precioMejora: 250 },
                    { nivel: 4, vida: 0, dps: 135, precioMejora: 500 },
                    { nivel: 5, vida: 0, dps: 170, precioMejora: 1000 },
                    { nivel: 6, vida: 0, dps: 210, precioMejora: 2000 },
                    { nivel: 7, vida: 0, dps: 260, precioMejora: 4000 },
                    { nivel: 8, vida: 0, dps: 320, precioMejora: 8000 },
                    { nivel: 9, vida: 0, dps: 390, precioMejora: 16000 },
                    { nivel: 10, vida: 0, dps: 480, precioMejora: 32000 }
                ], descripcion: "Trampa submarina explosiva" },
                { id: "plataforma", nombre: "Plataforma Artillada", emoji: "🛟", icono: "gun-platform", precio: 200, precioDiamantes: 0, rareza: "Común", maxNivel: 10, rango: 90, niveles: [
                    { nivel: 1, vida: 450, dps: 12, precioMejora: 0 },
                    { nivel: 2, vida: 500, dps: 16, precioMejora: 120 },
                    { nivel: 3, vida: 560, dps: 21, precioMejora: 300 },
                    { nivel: 4, vida: 630, dps: 27, precioMejora: 600 },
                    { nivel: 5, vida: 700, dps: 34, precioMejora: 1200 },
                    { nivel: 6, vida: 780, dps: 42, precioMejora: 2500 },
                    { nivel: 7, vida: 870, dps: 52, precioMejora: 5000 },
                    { nivel: 8, vida: 970, dps: 64, precioMejora: 10000 },
                    { nivel: 9, vida: 1080, dps: 78, precioMejora: 20000 },
                    { nivel: 10, vida: 1200, dps: 95, precioMejora: 40000 }
                ], descripcion: "Base flotante defensiva" },
                // RAROS - 5 niveles
                { id: "torreta_naval", nombre: "Cañón Costero", emoji: "🎯", icono: "coastal-cannon", precio: 1000, precioDiamantes: 0, rareza: "Raro", maxNivel: 5, rango: 130, niveles: [
                    { nivel: 1, vida: 650, dps: 45, precioMejora: 0 },
                    { nivel: 2, vida: 800, dps: 60, precioMejora: 2500 },
                    { nivel: 3, vida: 980, dps: 80, precioMejora: 6000 },
                    { nivel: 4, vida: 1200, dps: 105, precioMejora: 15000 },
                    { nivel: 5, vida: 1480, dps: 140, precioMejora: 35000 }
                ], descripcion: "Artillería de precisión" },
                // ÉPICOS - 3 niveles
                { id: "submarino_def", nombre: "Submarino Cazador", emoji: "🐋", icono: "hunter-sub", precio: 4000, precioDiamantes: 0, rareza: "Épico", maxNivel: 3, rango: 110, niveles: [
                    { nivel: 1, vida: 900, dps: 80, precioMejora: 0 },
                    { nivel: 2, vida: 1200, dps: 115, precioMejora: 18000 },
                    { nivel: 3, vida: 1600, dps: 160, precioMejora: 55000 }
                ], descripcion: "Depredador silencioso" },
                // MÍTICOS - 2 niveles
                { id: "hydra", nombre: "Hidra Marina", emoji: "🐉", icono: "sea-hydra", precio: 18000, precioDiamantes: 100, rareza: "Mítico", maxNivel: 2, rango: 160, niveles: [
                    { nivel: 1, vida: 1400, dps: 180, precioMejora: 0 },
                    { nivel: 2, vida: 2100, dps: 280, precioMejora: 120000 }
                ], descripcion: "Bestia marina mecánica" },
                // LEGENDARIOS - 1 nivel
                { id: "fortaleza_naval", nombre: "Ciudadela Oceánica", emoji: "🏯", icono: "ocean-citadel", precio: 60000, precioDiamantes: 300, rareza: "Legendario", maxNivel: 1, rango: 200, niveles: [
                    { nivel: 1, vida: 3000, dps: 350, precioMejora: 0 }
                ], descripcion: "Bastión naval supremo" }
            ],
            muros: {
                id: "muro_naval",
                nombre: "Barrera Marina",
                maxNivel: 10,
                niveles: [
                    { nivel: 1, vida: 250, emoji: "🛟", precio: 50 },
                    { nivel: 2, vida: 400, emoji: "🛟", precio: 150 },
                    { nivel: 3, vida: 600, emoji: "⚓", precio: 400 },
                    { nivel: 4, vida: 850, emoji: "⚓", precio: 1000 },
                    { nivel: 5, vida: 1150, emoji: "🌊", precio: 2500 },
                    { nivel: 6, vida: 1500, emoji: "🌊", precio: 5000 },
                    { nivel: 7, vida: 2000, emoji: "🔱", precio: 10000 },
                    { nivel: 8, vida: 2600, emoji: "🔱", precio: 25000 },
                    { nivel: 9, vida: 3300, emoji: "🧊", precio: 50000 },
                    { nivel: 10, vida: 4200, emoji: "💎", precio: 100000 }
                ]
            }
        },
        aire: {
            nombre: "Aéreo",
            rangoRequerido: 5, // Comandante
            estructuras: [
                // COMUNES - 10 niveles
                { id: "globo_barrera", nombre: "Red de Globos", emoji: "🎈", icono: "balloon-net", precio: 0, precioDiamantes: 0, rareza: "Común", maxNivel: 10, rango: 60, niveles: [
                    { nivel: 1, vida: 200, dps: 8, precioMejora: 0 },
                    { nivel: 2, vida: 250, dps: 12, precioMejora: 100 },
                    { nivel: 3, vida: 310, dps: 17, precioMejora: 250 },
                    { nivel: 4, vida: 380, dps: 23, precioMejora: 500 },
                    { nivel: 5, vida: 460, dps: 30, precioMejora: 1000 },
                    { nivel: 6, vida: 550, dps: 38, precioMejora: 2000 },
                    { nivel: 7, vida: 650, dps: 48, precioMejora: 4000 },
                    { nivel: 8, vida: 760, dps: 60, precioMejora: 8000 },
                    { nivel: 9, vida: 890, dps: 74, precioMejora: 16000 },
                    { nivel: 10, vida: 1050, dps: 90, precioMejora: 32000 }
                ], descripcion: "Obstáculos aéreos tácticos" },
                { id: "radar", nombre: "Radar Avanzado", emoji: "📡", icono: "advanced-radar", precio: 300, precioDiamantes: 0, rareza: "Común", maxNivel: 10, rango: 180, niveles: [
                    { nivel: 1, vida: 350, dps: 10, precioMejora: 0 },
                    { nivel: 2, vida: 400, dps: 14, precioMejora: 120 },
                    { nivel: 3, vida: 460, dps: 19, precioMejora: 300 },
                    { nivel: 4, vida: 530, dps: 25, precioMejora: 600 },
                    { nivel: 5, vida: 610, dps: 32, precioMejora: 1200 },
                    { nivel: 6, vida: 700, dps: 40, precioMejora: 2500 },
                    { nivel: 7, vida: 800, dps: 50, precioMejora: 5000 },
                    { nivel: 8, vida: 920, dps: 62, precioMejora: 10000 },
                    { nivel: 9, vida: 1060, dps: 76, precioMejora: 20000 },
                    { nivel: 10, vida: 1220, dps: 92, precioMejora: 40000 }
                ], descripcion: "Detección de largo alcance" },
                // RAROS - 5 niveles
                { id: "aa_ligero", nombre: "Antiaéreo Veloz", emoji: "🔫", icono: "fast-aa", precio: 1200, precioDiamantes: 0, rareza: "Raro", maxNivel: 5, rango: 120, niveles: [
                    { nivel: 1, vida: 550, dps: 50, precioMejora: 0 },
                    { nivel: 2, vida: 680, dps: 68, precioMejora: 2500 },
                    { nivel: 3, vida: 840, dps: 92, precioMejora: 6000 },
                    { nivel: 4, vida: 1040, dps: 125, precioMejora: 15000 },
                    { nivel: 5, vida: 1300, dps: 170, precioMejora: 35000 }
                ], descripcion: "Defensa rápida del cielo" },
                // ÉPICOS - 3 niveles
                { id: "aa_pesado", nombre: "Bóveda de Misiles", emoji: "🚀", icono: "missile-vault", precio: 5000, precioDiamantes: 0, rareza: "Épico", maxNivel: 3, rango: 150, niveles: [
                    { nivel: 1, vida: 1000, dps: 90, precioMejora: 0 },
                    { nivel: 2, vida: 1350, dps: 130, precioMejora: 20000 },
                    { nivel: 3, vida: 1800, dps: 185, precioMejora: 60000 }
                ], descripcion: "Lluvia de misiles" },
                // MÍTICOS - 2 niveles
                { id: "tormenta", nombre: "Generador de Tormentas", emoji: "⛈️", icono: "storm-gen", precio: 20000, precioDiamantes: 125, rareza: "Mítico", maxNivel: 2, rango: 200, niveles: [
                    { nivel: 1, vida: 1600, dps: 200, precioMejora: 0 },
                    { nivel: 2, vida: 2400, dps: 320, precioMejora: 150000 }
                ], descripcion: "Controla el clima" },
                // LEGENDARIOS - 1 nivel
                { id: "escudo_energia", nombre: "Domo Celestial", emoji: "🛡️", icono: "celestial-dome", precio: 75000, precioDiamantes: 500, rareza: "Legendario", maxNivel: 1, rango: 250, niveles: [
                    { nivel: 1, vida: 3500, dps: 400, precioMejora: 0 }
                ], descripcion: "Barrera energética absoluta" }
            ],
            muros: {
                id: "muro_aereo",
                nombre: "Campo de Fuerza",
                maxNivel: 10,
                niveles: [
                    { nivel: 1, vida: 200, emoji: "☁️", precio: 50 },
                    { nivel: 2, vida: 350, emoji: "☁️", precio: 150 },
                    { nivel: 3, vida: 550, emoji: "💨", precio: 400 },
                    { nivel: 4, vida: 800, emoji: "💨", precio: 1000 },
                    { nivel: 5, vida: 1100, emoji: "⚡", precio: 2500 },
                    { nivel: 6, vida: 1450, emoji: "⚡", precio: 5000 },
                    { nivel: 7, vida: 1900, emoji: "🌀", precio: 10000 },
                    { nivel: 8, vida: 2450, emoji: "🌀", precio: 25000 },
                    { nivel: 9, vida: 3100, emoji: "✨", precio: 50000 },
                    { nivel: 10, vida: 4000, emoji: "💎", precio: 100000 }
                ]
            }
        }
    };

    // ==========================================
    // 🎮 MAPAS TANK STARS - TIERRA
    // Mapas con efectos reales: gravedad, viento, 
    // plataformas, vacíos, agua, hielo, lava
    // ==========================================
    
    // ==========================================
    // MAPAS - 1 MAPA DESBLOQUEADO POR DOMINIO
    // Los demás muestran "Próximamente"
    // ==========================================
    this.mapasShooter = {
        tierra: [
            // MAPA PRINCIPAL - DESBLOQUEADO
            {
                id: "colinas_guerra",
                nombre: "Colinas de Guerra",
                emoji: "⛰️",
                rareza: "Común",
                nivel: 1,
                precio: 0,
                desbloqueado: true,
                descripcion: "Terreno clásico con colinas. El campo de batalla perfecto.",
                config: {
                    ancho: 1400,
                    alto: 700,
                    gravedad: 0.35,
                    vientoBase: 0.3,
                    tipoTerreno: "colinas",
                    colores: {
                        cielo: ["#87CEEB", "#5BA3D6", "#4A9BD1"],
                        tierra: ["#4CAF50", "#388E3C", "#5D4037"],
                        decoracion: "#8BC34A"
                    },
                    decoraciones: ["🌳", "🌲", "🌿", "🌾"],
                    ambiente: "dia"
                }
            },
            // MAPAS PRÓXIMAMENTE
            {
                id: "desierto_proximo",
                nombre: "Dunas del Desierto",
                emoji: "🏜️",
                rareza: "Raro",
                nivel: 2,
                precio: 0,
                desbloqueado: false,
                proximamente: true,
                descripcion: "🔒 Próximamente - Arena y viento del desierto"
            },
            {
                id: "volcan_proximo",
                nombre: "Volcán Activo",
                emoji: "🌋",
                rareza: "Épico",
                nivel: 3,
                precio: 0,
                desbloqueado: false,
                proximamente: true,
                descripcion: "🔒 Próximamente - Lava y destrucción"
            },
            {
                id: "luna_proximo",
                nombre: "Base Lunar",
                emoji: "🌙",
                rareza: "Legendario",
                nivel: 4,
                precio: 0,
                desbloqueado: false,
                proximamente: true,
                descripcion: "🔒 Próximamente - Gravedad cero"
            }
        ],
        
        mar: [
            // MAPA PRINCIPAL - DESBLOQUEADO
            {
                id: "oceano_batalla",
                nombre: "Océano de Batalla",
                emoji: "🌊",
                rareza: "Común",
                nivel: 1,
                precio: 0,
                desbloqueado: true,
                descripcion: "Aguas abiertas para batalla naval clásica.",
                config: {
                    ancho: 12, // Tablero 12x12
                    alto: 12,
                    fondo: "linear-gradient(180deg, #87CEEB 0%, #1E90FF 40%, #006994 100%)"
                }
            },
            // MAPAS PRÓXIMAMENTE
            {
                id: "artico_proximo",
                nombre: "Aguas Árticas",
                emoji: "🧊",
                rareza: "Raro",
                nivel: 2,
                precio: 0,
                desbloqueado: false,
                proximamente: true,
                descripcion: "🔒 Próximamente - Icebergs flotantes"
            },
            {
                id: "bermudas_proximo",
                nombre: "Triángulo Bermudas",
                emoji: "🔺",
                rareza: "Épico",
                nivel: 3,
                precio: 0,
                desbloqueado: false,
                proximamente: true,
                descripcion: "🔒 Próximamente - Misterios del mar"
            }
        ],
        
        aire: [
            // MAPA PRINCIPAL - DESBLOQUEADO
            {
                id: "espacio_abierto",
                nombre: "Espacio Abierto",
                emoji: "🌌",
                rareza: "Común",
                nivel: 1,
                precio: 0,
                desbloqueado: true,
                descripcion: "El vacío del espacio. Destruye las oleadas alienígenas.",
                config: {
                    ancho: 800,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #000011 100%)",
                    estrellas: true
                }
            },
            // MAPAS PRÓXIMAMENTE
            {
                id: "nebulosa_proximo",
                nombre: "Nebulosa Púrpura",
                emoji: "💜",
                rareza: "Raro",
                nivel: 2,
                precio: 0,
                desbloqueado: false,
                proximamente: true,
                descripcion: "🔒 Próximamente - Gases cósmicos"
            },
            {
                id: "asteroide_proximo",
                nombre: "Campo Asteroides",
                emoji: "☄️",
                rareza: "Épico",
                nivel: 3,
                precio: 0,
                desbloqueado: false,
                proximamente: true,
                descripcion: "🔒 Próximamente - Rocas espaciales"
            }
        ]
    };

    // Datos del jugador mejorados - Sistema estilo Clash of Clans
    this.datosJugador = {
        monedas: 1000,
        diamantes: 50,
        rangoActual: 0,
        ligaActual: 0,
        experiencia: 0,
        partidasJugadas: 0,
        victorias: 0,
        derrotas: 0,
        empates: 0,
        copas: 0,
        nivel: 1,
        xp: 0,
        dominiosDesbloqueados: ['tierra', 'mar', 'aire'], // Todos desbloqueados
        unidadesDesbloqueadas: {},
        defensasDesbloqueadas: {},
        // Cuartel General por dominio
        cuartelGeneral: {
            tierra: { nivel: 1 },
            mar: { nivel: 1 },
            aire: { nivel: 1 }
        },
        // Muros por dominio
        muros: {
            tierra: { cantidad: 5, nivel: 1 },
            mar: { cantidad: 5, nivel: 1 },
            aire: { cantidad: 5, nivel: 1 }
        },
        // Aldea/Base del jugador - defensas colocadas con su nivel
        aldea: {
            tierra: [], // { id: 'canon', nivel: 1, posX: 0, posY: 0 }
            mar: [],
            aire: []
        },
        // Edificios colocados en cada base (con su vida actual para combate)
        edificiosBase: {
            tierra: [],
            mar: [],
            aire: []
        },
        // Sistema de niveles Space Invaders (aire)
        nivelAire: 1,
        vidasAire: 5,
        estrellasAire: {}
    };
    
    // ==========================================
    // SISTEMA DE PERSISTENCIA (GUARDAR/CARGAR)
    // ==========================================
    
    // Guardar progreso en localStorage
    this.guardarProgreso = function() {
        const email = $.cookie('email') || $.cookie('nick');
        if (!email) return;
        
        const datosGuardar = {
            ...this.datosJugador,
            timestamp: Date.now()
        };
        
        localStorage.setItem(`strikecommand_${email}`, JSON.stringify(datosGuardar));
        console.log('💾 Progreso guardado');
    };
    
    // Cargar progreso desde localStorage
    this.cargarProgreso = function() {
        const email = $.cookie('email') || $.cookie('nick');
        if (!email) return false;
        
        const datosGuardados = localStorage.getItem(`strikecommand_${email}`);
        if (datosGuardados) {
            try {
                const datos = JSON.parse(datosGuardados);
                
                // Restaurar datos del jugador
                this.datosJugador = {
                    ...this.datosJugador,
                    ...datos
                };
                
                // Verificar dominios desbloqueados por copas
                this.verificarDesbloqueosDominios();
                
                console.log('📂 Progreso cargado:', this.datosJugador);
                return true;
            } catch (e) {
                console.error('Error al cargar progreso:', e);
                return false;
            }
        }
        return false;
    };
    
    // Verificar y desbloquear dominios según copas
    this.verificarDesbloqueosDominios = function() {
        // TEMPORALMENTE: Todos los dominios desbloqueados para testing
        this.datosJugador.dominiosDesbloqueados = ['tierra', 'mar', 'aire'];
        
        /* SISTEMA DE DESBLOQUEO POR COPAS (Activar cuando esté listo)
        const copas = this.datosJugador.copas;
        
        // Tierra siempre desbloqueada
        if (!this.datosJugador.dominiosDesbloqueados.includes('tierra')) {
            this.datosJugador.dominiosDesbloqueados.push('tierra');
        }
        
        // Mar se desbloquea en Cabo I (300 copas)
        if (copas >= 300 && !this.datosJugador.dominiosDesbloqueados.includes('mar')) {
            this.datosJugador.dominiosDesbloqueados.push('mar');
            this.mostrarMensaje('🌊 ¡Dominio MAR desbloqueado!');
        }
        
        // Aire se desbloquea en Comandante I (2500 copas)
        if (copas >= 2500 && !this.datosJugador.dominiosDesbloqueados.includes('aire')) {
            this.datosJugador.dominiosDesbloqueados.push('aire');
            this.mostrarMensaje('☁️ ¡Dominio AIRE desbloqueado!');
        }
        */
    };
    
    // Auto-guardar cada 30 segundos
    this.iniciarAutoGuardado = function() {
        setInterval(() => {
            this.guardarProgreso();
        }, 30000);
    };

    // Verificar si el jugador sube de nivel
    this.verificarSubidaNivel = function() {
        const datos = this.datosJugador;
        let nivel = datos.nivel || 1;
        let xp = datos.xp || 0;
        let xpNecesario = nivel * 100;
        let subioNivel = false;
        let nivelesSubidos = 0;
        let oroTotal = 0;
        let diamantesTotal = 0;
        
        while (xp >= xpNecesario) {
            xp -= xpNecesario;
            nivel++;
            nivelesSubidos++;
            subioNivel = true;
            
            // Recompensas por subir de nivel
            const oroRecompensa = nivel * 50;
            datos.monedas += oroRecompensa;
            oroTotal += oroRecompensa;
            
            // Cada 5 niveles da diamantes
            if (nivel % 5 === 0) {
                const diamantesRecompensa = nivel * 2;
                datos.diamantes += diamantesRecompensa;
                diamantesTotal += diamantesRecompensa;
            }
            
            // Recalcular XP necesario para el siguiente nivel
            xpNecesario = nivel * 100;
        }
        
        datos.nivel = nivel;
        datos.xp = xp;
        
        // Mostrar notificación de subida de nivel
        if (subioNivel) {
            let mensajeRecompensas = `💰 +${oroTotal} Oro`;
            if (diamantesTotal > 0) {
                mensajeRecompensas += ` | 💎 +${diamantesTotal} Diamantes`;
            }
            
            this.mostrarNotificacionNivel(nivel, mensajeRecompensas);
            this.actualizarPerfilStats();
        }
    };
    
    // Mostrar notificación grande de subida de nivel
    this.mostrarNotificacionNivel = function(nivel, recompensas) {
        // Remover notificación anterior si existe
        $('#levelUpNotification').remove();
        
        const html = `
            <div id="levelUpNotification" class="level-up-notification">
                <div class="level-up-content">
                    <div class="level-up-icon">🎉</div>
                    <h2 class="level-up-title">¡SUBISTE DE NIVEL!</h2>
                    <div class="level-up-level">Nivel ${nivel}</div>
                    <div class="level-up-rewards">${recompensas}</div>
                    <button class="level-up-close" onclick="$('#levelUpNotification').fadeOut(300, function(){ $(this).remove(); })">Continuar</button>
                </div>
            </div>
        `;
        
        $('body').append(html);
        
        // Auto cerrar después de 5 segundos
        setTimeout(() => {
            $('#levelUpNotification').fadeOut(300, function(){ $(this).remove(); });
        }, 5000);
    };

    // Función para actualizar monedas en todos los lugares
    this.actualizarMonedas = function() {
        $('#playerCoins').text(this.datosJugador.monedas);
        $('#statMonedas').text(this.datosJugador.monedas);
        $('#playerDiamonds').text(this.datosJugador.diamantes);
        $('#statDiamantes').text(this.datosJugador.diamantes);
        $('#gameCoins').text(this.datosJugador.monedas);
        
        // Guardar progreso al actualizar monedas
        this.guardarProgreso();
    };
    
    // Mostrar ventana de recompensas por nivel
    this.mostrarRecompensasNivel = function() {
        const recompensas = [];
        for (let i = 1; i <= 50; i++) {
            let reward = { nivel: i, oro: 0, diamantes: 0, especial: '' };
            
            // Cada nivel da oro
            reward.oro = i * 50;
            
            // Cada 5 niveles da diamantes extra
            if (i % 5 === 0) {
                reward.diamantes = i * 2;
                reward.especial = '💎 Bonus Diamantes';
            }
            
            // Cada 10 niveles da una recompensa especial
            if (i % 10 === 0) {
                reward.diamantes += i * 5;
                reward.especial = '🎁 Cofre Especial + Diamantes';
            }
            
            recompensas.push(reward);
        }
        
        const nivelActual = this.datosJugador.nivel || 1;
        
        let html = `
            <div class="rewards-modal">
                <div class="rewards-header">
                    <h3>🎁 Recompensas por Nivel</h3>
                    <p>Tu nivel actual: <span class="highlight">Nv. ${nivelActual}</span></p>
                </div>
                <div class="rewards-list">
        `;
        
        // Mostrar niveles cercanos al actual (5 antes y 10 después)
        const inicio = Math.max(1, nivelActual - 5);
        const fin = Math.min(50, nivelActual + 10);
        
        for (let i = inicio; i <= fin; i++) {
            const r = recompensas[i - 1];
            const esPasado = i < nivelActual;
            const esActual = i === nivelActual;
            const esFuturo = i > nivelActual;
            
            let clase = 'reward-item';
            if (esPasado) clase += ' claimed';
            if (esActual) clase += ' current';
            if (esFuturo) clase += ' locked';
            
            html += `
                <div class="${clase}">
                    <div class="reward-level">Nv. ${i}</div>
                    <div class="reward-content">
                        <span>💰 ${r.oro}</span>
                        ${r.diamantes > 0 ? `<span>💎 ${r.diamantes}</span>` : ''}
                        ${r.especial ? `<span class="reward-special">${r.especial}</span>` : ''}
                    </div>
                    <div class="reward-status">
                        ${esPasado ? '✅' : esActual ? '⭐' : '🔒'}
                    </div>
                </div>
            `;
        }
        
        html += `
                </div>
                <button class="btn-close-rewards" onclick="$('#modalRecompensas').remove();">Cerrar</button>
            </div>
        `;
        
        // Crear modal
        const modal = $(`
            <div id="modalRecompensas" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            ">
                ${html}
            </div>
        `);
        
        $('body').append(modal);
    };

    // Obtener info del rango actual
    this.getRangoInfo = function() {
        const rangoIndex = this.datosJugador.rangoActual || 0;
        const subligaIndex = this.datosJugador.ligaActual || 0;
        const rango = this.sistemRangos.rangos[rangoIndex] || this.sistemRangos.rangos[0];
        const subligas = ['I', 'II', 'III'];
        const subliga = subligas[subligaIndex] || 'I';
        return {
            ...rango,
            liga: subliga,
            nombreCompleto: `${rango.nombre} ${subliga}`
        };
    };
    
    // Calcular progreso hacia el siguiente rango/subliga
    this.calcularProgresoCopas = function() {
        const copas = this.datosJugador.copas || 0;
        const rangoIndex = this.datosJugador.rangoActual || 0;
        const subligaIndex = this.datosJugador.ligaActual || 0;
        const rango = this.sistemRangos.rangos[rangoIndex];
        
        // Encontrar el objetivo (siguiente subliga o siguiente rango)
        let objetivo = 50; // Default
        let puntoBase = 0;
        
        if (rango && rango.puntos) {
            puntoBase = rango.puntos[subligaIndex] || 0;
            
            // Si hay siguiente subliga en el mismo rango
            if (subligaIndex < rango.puntos.length - 1) {
                objetivo = rango.puntos[subligaIndex + 1];
            } 
            // Si hay siguiente rango
            else if (rangoIndex < this.sistemRangos.rangos.length - 1) {
                const siguienteRango = this.sistemRangos.rangos[rangoIndex + 1];
                objetivo = siguienteRango.puntos[0];
            } else {
                // Ya es el máximo
                objetivo = rango.puntos[rango.puntos.length - 1];
            }
        }
        
        // Calcular porcentaje entre punto base y objetivo
        const rango_ = objetivo - puntoBase;
        const progreso = copas - puntoBase;
        const porcentaje = rango_ > 0 ? Math.min(100, Math.max(0, (progreso / rango_) * 100)) : 100;
        
        return { objetivo, porcentaje: Math.floor(porcentaje) };
    };

    // Verificar si un dominio está desbloqueado
    this.dominioDesbloqueado = function(dominio) {
        return this.datosJugador.dominiosDesbloqueados.includes(dominio);
    };

    // ==========================================
    // VERIFICACIÓN DE COMPRAS ANTES DE PARTIDA
    // ==========================================
    
    this.verificarComprasParaPartida = function(dominio) {
        // Verificar que se haya seleccionado tropa y mapa
        if (!this.shooterSeleccion.tropa || !this.shooterSeleccion.mapa) {
            return {
                valido: false,
                mensaje: '⚠️ Selecciona un personaje y un mapa para jugar'
            };
        }
        
        // Obtener la tropa seleccionada
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const tropaSeleccionada = tropas.find(t => t.id === this.shooterSeleccion.tropa);
        
        if (!tropaSeleccionada) {
            return {
                valido: false,
                mensaje: '❌ Error: Personaje no encontrado'
            };
        }
        
        // Verificar si la tropa está desbloqueada
        if (!tropaSeleccionada.desbloqueado && 
            !this.datosJugador.tropasDesbloqueadas?.[tropaSeleccionada.id]) {
            return {
                valido: false,
                mensaje: `🔒 ¡Debes comprar "${tropaSeleccionada.nombre}" primero! Ve a la tienda.`
            };
        }
        
        // Obtener el mapa seleccionado
        const mapas = this.mapasShooter[dominio] || [];
        const mapaSeleccionado = mapas.find(m => m.id === this.shooterSeleccion.mapa);
        
        if (!mapaSeleccionado) {
            return {
                valido: false,
                mensaje: '❌ Error: Mapa no encontrado'
            };
        }
        
        // Verificar si el mapa está desbloqueado
        const mapaDesbloqueado = mapaSeleccionado.desbloqueado || 
            this.datosJugador.mapasDesbloqueados?.includes(mapaSeleccionado.id);
        
        if (!mapaDesbloqueado) {
            return {
                valido: false,
                mensaje: `🔒 ¡Debes comprar el mapa "${mapaSeleccionado.nombre}" primero! Ve a la tienda.`
            };
        }
        
        // Todo verificado correctamente
        return {
            valido: true,
            mensaje: '✅ ¡Listo para jugar!',
            tropa: tropaSeleccionada,
            mapa: mapaSeleccionado
        };
    };

    // Inicializar unidades y defensas gratis
    this.inicializarJugador = function() {
        // Para tierra (shooter), desbloquear soldado gratis
        if (this.unidadesAtaque.tierra.tipoJuego === 'shooter') {
            const tropaGratisTierra = this.unidadesAtaque.tierra.tropas.find(t => t.precio === 0 || t.desbloqueado);
            if (tropaGratisTierra) {
                if (!this.datosJugador.tropasDesbloqueadas) {
                    this.datosJugador.tropasDesbloqueadas = {};
                }
                this.datosJugador.tropasDesbloqueadas[tropaGratisTierra.id] = { nivel: 1 };
            }
        } else {
            // Sistema antiguo para otros dominios
            const unidadGratisTierra = this.unidadesAtaque.tierra.unidades?.find(u => u.precio === 0);
            if (unidadGratisTierra) {
                this.datosJugador.unidadesDesbloqueadas[unidadGratisTierra.id] = { nivel: 1 };
            }
        }
        
        // Defensas
        const defensaGratisTierra = this.defensas.tierra?.estructuras?.find(d => d.precio === 0);
        if (defensaGratisTierra) {
            this.datosJugador.defensasDesbloqueadas[defensaGratisTierra.id] = { nivel: 1 };
        }
    };
    this.inicializarJugador();

    // ==========================================
    // MENÚS DE DOMINIO
    // ==========================================
    
    this.mostrarMenuDominio = function(dominio) {
        this.limpiar();
        const dataAtaque = this.unidadesAtaque[dominio];
        
        const temaClases = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };

        const bgClases = {
            tierra: 'domain-bg-tierra',
            mar: 'domain-bg-mar',
            aire: 'domain-bg-aire'
        };
        
        const decoraciones = {
            tierra: ['🪖', '🛡️', '💥', '🎖️'],
            mar: ['⚓', '🌊', '🚢', '🐚'],
            aire: ['☁️', '✈️', '🦅', '🌤️']
        };

        this.setDomainBackground(bgClases[dominio]);
        
        const nivelCuartel = this.datosJugador.cuartelGeneral[dominio].nivel;
        const infoCuartel = this.cuartelGeneral.niveles[nivelCuartel - 1];

        // Todos los dominios usan el sistema shooter
        const esShooter = dataAtaque && dataAtaque.tipoJuego === 'shooter';
        
        const menu = `
            <div class="domain-menu ${temaClases[dominio]}" id="domainMenu">
                <div class="domain-menu-header">
                    <div class="domain-title-container">
                        <span class="domain-big-icon">${dataAtaque.emoji}</span>
                        <h2 class="domain-title">Combate ${dataAtaque.nombre}</h2>
                    </div>
                    <div class="domain-decoration">
                        ${decoraciones[dominio].map(d => `<span class="deco-item">${d}</span>`).join('')}
                    </div>
                </div>
                
                <div class="cuartel-info-bar">
                    <span class="cuartel-icon">🎯</span>
                    <span class="cuartel-text">Arena de Combate</span>
                    <span class="cuartel-desc">Elige tu modo de juego</span>
                </div>
                
                <div class="domain-menu-content">
                    <button class="domain-menu-btn btn-unjugador-domain" id="btnUnJugadorDomain">
                        <span class="btn-icon">🤖</span>
                        <span class="btn-text">Jugar vs IA</span>
                        <span class="btn-desc">Combate contra la inteligencia artificial</span>
                    </button>
                    
                    <button class="domain-menu-btn btn-multijugador-domain" id="btnMultijugadorDomain">
                        <span class="btn-icon">👥</span>
                        <span class="btn-text">Multijugador</span>
                        <span class="btn-desc">Duelo 1v1 contra otro jugador</span>
                    </button>
                    
                    <button class="domain-menu-btn btn-personalizar-domain" id="btnPersonalizarDomain">
                        <span class="btn-icon">🏪</span>
                        <span class="btn-text">Tienda</span>
                        <span class="btn-desc">Compra unidades y mapas</span>
                    </button>
                    
                    <button class="domain-menu-btn btn-salir-domain" id="btnSalirDomain">
                        <span class="btn-icon">🔙</span>
                        <span class="btn-text">Salir</span>
                        <span class="btn-desc">Volver al menú principal</span>
                    </button>
                </div>
            </div>
        `;
        
        $("#au").html(menu);
        this.dominioActual = dominio;
        
        $("#btnUnJugadorDomain").on("click", () => cw.mostrarPanelShooterDominio(dominio));
        $("#btnMultijugadorDomain").on("click", () => cw.mostrarPanelMultijugadorDominio(dominio));
        $("#btnPersonalizarDomain").on("click", () => cw.mostrarTienda(dominio));
        $("#btnSalirDomain").on("click", () => {
            cw.removeDomainBackground();
            cw.mostrarMenuPrincipal();
        });
    }

    // ==========================================
    // CLANES POR DOMINIO
    // ==========================================
    
    this.mostrarClanes = function(dominio) {
        const temaClases = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };

        const bgClases = {
            tierra: 'domain-bg-tierra',
            mar: 'domain-bg-mar',
            aire: 'domain-bg-aire'
        };
        
        const nombresDominio = {
            tierra: 'Terrestre',
            mar: 'Naval',
            aire: 'Aéreo'
        };

        const emojis = {
            tierra: '🎖️',
            mar: '🚢',
            aire: '✈️'
        };

        this.limpiar();
        this.setDomainBackground(bgClases[dominio]);
        
        const contenido = `
            <div class="domain-menu ${temaClases[dominio]}" id="clanScreen">
                <div class="domain-menu-header">
                    <div class="domain-title-container">
                        <span class="domain-big-icon">${emojis[dominio]}</span>
                        <h2 class="domain-title">Clanes ${nombresDominio[dominio]}s</h2>
                    </div>
                </div>
                
                <div class="mantenimiento-container">
                    <div class="mantenimiento-icon">🔧</div>
                    <h3 class="mantenimiento-title">¡Próximamente!</h3>
                    <p class="mantenimiento-text">
                        Los Clanes ${nombresDominio[dominio]}s están en desarrollo.<br>
                        Pronto podrás unirte a un clan, competir en guerras de clanes<br>
                        y demostrar tu dominio ${nombresDominio[dominio].toLowerCase()}.<br><br>
                        <strong>¡Mantente atento a las actualizaciones!</strong>
                    </p>
                    <div class="mantenimiento-features">
                        <div class="feature-item">⚔️ Guerras de Clanes</div>
                        <div class="feature-item">🏆 Torneos Exclusivos</div>
                        <div class="feature-item">💬 Chat de Clan</div>
                        <div class="feature-item">🎁 Recompensas Grupales</div>
                    </div>
                </div>
                
                <button class="domain-menu-btn btn-salir-domain" id="btnVolverClanes">
                    <span class="btn-icon">🔙</span>
                    <span class="btn-text">Volver</span>
                    <span class="btn-desc">Regresar al menú principal</span>
                </button>
            </div>
        `;
        
        $("#au").html(contenido);
        
        $("#btnVolverClanes").on("click", () => {
            cw.removeDomainBackground();
            cw.mostrarMenuPrincipal();
        });
    }

    // ==========================================
    // TORNEOS (TOP 100 MUNDIAL)
    // ==========================================
    
    this.mostrarTorneos = function() {
        this.limpiar();
        this.setDomainBackground('domain-bg-tierra');
        
        const contenido = `
            <div class="domain-menu domain-theme-land" id="torneosScreen">
                <div class="domain-menu-header">
                    <div class="domain-title-container">
                        <span class="domain-big-icon">🌍</span>
                        <h2 class="domain-title">Torneos Mundiales</h2>
                    </div>
                </div>
                
                <div class="mantenimiento-container">
                    <div class="mantenimiento-icon">🏆</div>
                    <h3 class="mantenimiento-title">¡En Desarrollo!</h3>
                    <p class="mantenimiento-text">
                        Los Torneos Mundiales están siendo preparados.<br><br>
                        Compite contra los <strong>100 mejores jugadores del mundo</strong><br>
                        en emocionantes torneos de eliminación directa.<br><br>
                        <strong>¡Próximamente disponible!</strong>
                    </p>
                    <div class="mantenimiento-features">
                        <div class="feature-item">🥇 Top 100 Global</div>
                        <div class="feature-item">💎 Premios Exclusivos</div>
                        <div class="feature-item">🗓️ Torneos Semanales</div>
                        <div class="feature-item">🏅 Títulos Especiales</div>
                    </div>
                </div>
                
                <button class="domain-menu-btn btn-salir-domain" id="btnVolverTorneos">
                    <span class="btn-icon">🔙</span>
                    <span class="btn-text">Volver</span>
                    <span class="btn-desc">Regresar al menú principal</span>
                </button>
            </div>
        `;
        
        $("#au").html(contenido);
        
        $("#btnVolverTorneos").on("click", () => {
            cw.removeDomainBackground();
            cw.mostrarMenuPrincipal();
        });
    }
    
    // ==========================================
    // VISTA DE MI ALDEA - Estilo Clash of Clans
    // ==========================================
    
    this.mostrarMiAldea = function(dominio) {
        this.limpiar();
        
        const temaClases = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };

        const bgClases = {
            tierra: 'domain-bg-tierra',
            mar: 'domain-bg-mar',
            aire: 'domain-bg-aire'
        };

        this.setDomainBackground(bgClases[dominio]);
        
        const nivelCuartel = this.datosJugador.cuartelGeneral[dominio].nivel;
        const infoCuartel = this.cuartelGeneral.niveles[nivelCuartel - 1];
        const aldeaDefensas = this.datosJugador.aldea[dominio] || [];
        const murosInfo = this.datosJugador.muros[dominio];
        const murosData = this.defensas[dominio].muros.niveles[murosInfo.nivel - 1];
        
        // Calcular vida total de la aldea
        let vidaTotalAldea = infoCuartel.vida;
        aldeaDefensas.forEach(def => {
            const defData = this.defensas[dominio].estructuras.find(d => d.id === def.id);
            if (defData && defData.niveles) {
                vidaTotalAldea += defData.niveles[def.nivel - 1].vida;
            }
        });
        vidaTotalAldea += murosInfo.cantidad * murosData.vida;
        
        // Calcular DPS total
        let dpsTotal = 0;
        aldeaDefensas.forEach(def => {
            const defData = this.defensas[dominio].estructuras.find(d => d.id === def.id);
            if (defData && defData.niveles) {
                dpsTotal += defData.niveles[def.nivel - 1].dps;
            }
        });

        const panelHTML = `
            <div class="aldea-panel ${temaClases[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">🏘️ Mi Aldea - ${this.unidadesAtaque[dominio].nombre}</h2>
                    <div class="player-resources">
                        <div class="player-coins">💰 <span id="playerCoins">${this.datosJugador.monedas}</span></div>
                        <div class="player-diamonds">💎 <span id="playerDiamonds">${this.datosJugador.diamantes}</span></div>
                    </div>
                    <button class="btn-back" id="btnVolverDominio">← Volver</button>
                </div>
                
                <div class="aldea-stats-bar">
                    <div class="stat-item">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-value">${vidaTotalAldea.toLocaleString()}</span>
                        <span class="stat-label">Vida Total</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-value">${dpsTotal}</span>
                        <span class="stat-label">DPS Total</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🏰</span>
                        <span class="stat-value">Nv.${nivelCuartel}</span>
                        <span class="stat-label">Cuartel</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-icon">🧱</span>
                        <span class="stat-value">${murosInfo.cantidad}x Nv.${murosInfo.nivel}</span>
                        <span class="stat-label">Muros</span>
                    </div>
                </div>
                
                <div class="aldea-view" id="aldeaView">
                    ${this.generarVistaAldea(dominio)}
                </div>
                
                <div class="aldea-controls">
                    <button class="aldea-btn btn-upgrade-cuartel" id="btnMejorarCuartel">
                        🏰 Mejorar Cuartel
                        <span class="btn-price">${nivelCuartel < 10 ? this.cuartelGeneral.niveles[nivelCuartel].precio.toLocaleString() + ' 💰' : 'MAX'}</span>
                    </button>
                    <button class="aldea-btn btn-upgrade-muros" id="btnMejorarMuros">
                        🧱 Mejorar Muros
                        <span class="btn-price">${murosInfo.nivel < 10 ? this.defensas[dominio].muros.niveles[murosInfo.nivel].precio.toLocaleString() + ' 💰' : 'MAX'}</span>
                    </button>
                    <button class="aldea-btn btn-add-muros" id="btnComprarMuros">
                        ➕ Comprar Muro
                        <span class="btn-price">${this.defensas[dominio].muros.niveles[murosInfo.nivel - 1].precio} 💰</span>
                    </button>
                    <button class="aldea-btn btn-add-defense" id="btnColocarDefensa">
                        🛡️ Colocar Defensa
                    </button>
                </div>
            </div>
        `;
        
        $("#au").html(panelHTML);
        
        $("#btnVolverDominio").on("click", () => cw.mostrarMenuDominio(dominio));
        $("#btnMejorarCuartel").on("click", () => cw.mejorarCuartel(dominio));
        $("#btnMejorarMuros").on("click", () => cw.mejorarMuros(dominio));
        $("#btnComprarMuros").on("click", () => cw.comprarMuro(dominio));
        $("#btnColocarDefensa").on("click", () => cw.mostrarDefensasDisponibles(dominio));
    }
    
    // Generar vista de la aldea
    this.generarVistaAldea = function(dominio) {
        const nivelCuartel = this.datosJugador.cuartelGeneral[dominio].nivel;
        const infoCuartel = this.cuartelGeneral.niveles[nivelCuartel - 1];
        const aldeaDefensas = this.datosJugador.aldea[dominio] || [];
        const murosInfo = this.datosJugador.muros[dominio];
        const murosData = this.defensas[dominio].muros.niveles[murosInfo.nivel - 1];
        
        const iconosCuartel = {
            tierra: ['🏠', '🏡', '🏘️', '🏰', '🏰', '🏯', '🏯', '🏰', '🏰', '👑'][nivelCuartel - 1],
            mar: ['⚓', '🚢', '🛳️', '🏗️', '🏭', '🏯', '🏯', '🏰', '🏰', '👑'][nivelCuartel - 1],
            aire: ['🛩️', '✈️', '🛫', '🏗️', '🏭', '🛡️', '🛡️', '🏰', '🏰', '👑'][nivelCuartel - 1]
        };
        
        let html = `
            <div class="aldea-grid">
                <!-- Muros superiores -->
                <div class="muros-row top-muros">
                    ${Array(Math.min(murosInfo.cantidad, 10)).fill(0).map(() => 
                        `<span class="muro-block" title="Muro Nv.${murosInfo.nivel} - ${murosData.vida} HP">${murosData.emoji}</span>`
                    ).join('')}
                </div>
                
                <!-- Zona de defensas -->
                <div class="defensas-zone">
                    <div class="muros-col left-muros">
                        ${Array(Math.floor(murosInfo.cantidad / 4)).fill(0).map(() => 
                            `<span class="muro-block">${murosData.emoji}</span>`
                        ).join('')}
                    </div>
                    
                    <div class="aldea-interior">
                        <!-- Cuartel General en el centro -->
                        <div class="cuartel-central" onclick="cw.mostrarInfoCuartel('${dominio}')">
                            <div class="cuartel-emoji">${iconosCuartel[dominio]}</div>
                            <div class="cuartel-nivel">Nv.${nivelCuartel}</div>
                            <div class="cuartel-vida">❤️ ${infoCuartel.vida.toLocaleString()}</div>
                        </div>
                        
                        <!-- Defensas colocadas -->
                        <div class="defensas-grid">
                            ${aldeaDefensas.length > 0 ? aldeaDefensas.map((def, index) => {
                                const defData = this.defensas[dominio].estructuras.find(d => d.id === def.id);
                                if (!defData) return '';
                                const nivelData = defData.niveles[def.nivel - 1];
                                return `
                                    <div class="defensa-slot" onclick="cw.mostrarInfoDefensa('${dominio}', ${index})">
                                        <div class="defensa-emoji">${defData.emoji}</div>
                                        <div class="defensa-nivel">Nv.${def.nivel}</div>
                                        <div class="defensa-stats">⚔️${nivelData.dps} ❤️${nivelData.vida}</div>
                                        <div class="defensa-nombre">${defData.nombre}</div>
                                    </div>
                                `;
                            }).join('') : `
                                <div class="no-defensas-msg">
                                    <p>⚠️ Sin defensas colocadas</p>
                                    <p>Compra defensas en la tienda y colócalas aquí</p>
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <div class="muros-col right-muros">
                        ${Array(Math.floor(murosInfo.cantidad / 4)).fill(0).map(() => 
                            `<span class="muro-block">${murosData.emoji}</span>`
                        ).join('')}
                    </div>
                </div>
                
                <!-- Muros inferiores -->
                <div class="muros-row bottom-muros">
                    ${Array(Math.min(murosInfo.cantidad, 10)).fill(0).map(() => 
                        `<span class="muro-block">${murosData.emoji}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        
        return html;
    }
    
    // Mejorar Cuartel General / Base Principal
    this.mejorarCuartel = function(dominio) {
        const nivelActual = this.datosJugador.cuartelGeneral[dominio].nivel;
        const nombreBase = this.nombreBasePrincipal[dominio];
        
        if (nivelActual >= 10) {
            this.mostrarMensaje(`🏰 Tu ${nombreBase} ya está al máximo nivel`);
            return;
        }
        
        const precioMejora = this.cuartelGeneral.niveles[nivelActual].precio;
        
        if (this.datosJugador.monedas >= precioMejora) {
            this.datosJugador.monedas -= precioMejora;
            this.datosJugador.cuartelGeneral[dominio].nivel++;
            this.actualizarMonedas();
            this.guardarProgreso();
            this.mostrarMensaje(`🏰 ¡${nombreBase} mejorado a nivel ${this.datosJugador.cuartelGeneral[dominio].nivel}!`);
            this.mostrarMiAldea(dominio);
        } else {
            this.mostrarMensaje(`❌ Necesitas ${precioMejora.toLocaleString()} monedas`);
        }
    }
    
    // Mejorar Muros
    this.mejorarMuros = function(dominio) {
        const nivelActual = this.datosJugador.muros[dominio].nivel;
        if (nivelActual >= 10) {
            this.mostrarMensaje('🧱 Tus muros ya están al máximo nivel');
            return;
        }
        
        const precioMejora = this.defensas[dominio].muros.niveles[nivelActual].precio;
        
        if (this.datosJugador.monedas >= precioMejora) {
            this.datosJugador.monedas -= precioMejora;
            this.datosJugador.muros[dominio].nivel++;
            this.actualizarMonedas();
            this.guardarProgreso();
            this.mostrarMensaje(`🧱 ¡Muros mejorados a nivel ${this.datosJugador.muros[dominio].nivel}!`);
            this.mostrarMiAldea(dominio);
        } else {
            this.mostrarMensaje(`❌ Necesitas ${precioMejora.toLocaleString()} monedas`);
        }
    }
    
    // Comprar más muros
    this.comprarMuro = function(dominio) {
        const nivelMuros = this.datosJugador.muros[dominio].nivel;
        const precioMuro = this.defensas[dominio].muros.niveles[nivelMuros - 1].precio;
        const maxMuros = this.cuartelGeneral.niveles[this.datosJugador.cuartelGeneral[dominio].nivel - 1].maxMuros;
        const nombreBase = this.nombreBasePrincipal[dominio];
        
        if (this.datosJugador.muros[dominio].cantidad >= maxMuros) {
            this.mostrarMensaje(`🧱 Máximo de muros alcanzado (${maxMuros}). Mejora tu ${nombreBase} para más.`);
            return;
        }
        
        if (this.datosJugador.monedas >= precioMuro) {
            this.datosJugador.monedas -= precioMuro;
            this.datosJugador.muros[dominio].cantidad++;
            this.actualizarMonedas();
            this.guardarProgreso();
            this.mostrarMensaje(`🧱 ¡Muro comprado! Total: ${this.datosJugador.muros[dominio].cantidad}`);
            this.mostrarMiAldea(dominio);
        } else {
            this.mostrarMensaje(`❌ Necesitas ${precioMuro} monedas`);
        }
    }
    
    // Mostrar defensas disponibles para colocar
    this.mostrarDefensasDisponibles = function(dominio) {
        const defensasCompradas = Object.keys(this.datosJugador.defensasDesbloqueadas);
        const defensasColocadas = this.datosJugador.aldea[dominio].map(d => d.id);
        const defensasDisponibles = defensasCompradas.filter(id => {
            const def = this.defensas[dominio].estructuras.find(d => d.id === id);
            return def && !defensasColocadas.includes(id);
        });
        
        if (defensasDisponibles.length === 0) {
            this.mostrarMensaje('⚠️ No tienes defensas disponibles. Compra en la tienda.');
            return;
        }
        
        let html = '<div style="text-align: center;"><h3>🛡️ Selecciona una defensa para colocar</h3><div class="defensas-selector">';
        
        defensasDisponibles.forEach(defId => {
            const def = this.defensas[dominio].estructuras.find(d => d.id === defId);
            if (def) {
                const nivel = this.datosJugador.defensasDesbloqueadas[defId].nivel || 1;
                const nivelData = def.niveles[nivel - 1];
                html += `
                    <div class="defensa-option" onclick="cw.colocarDefensa('${dominio}', '${defId}')">
                        <span class="def-emoji">${def.emoji}</span>
                        <span class="def-nombre">${def.nombre}</span>
                        <span class="def-stats">⚔️${nivelData.dps} ❤️${nivelData.vida}</span>
                    </div>
                `;
            }
        });
        
        html += '</div><button class="btn btn-secondary mt-3" onclick="$(\'#miModal\').modal(\'hide\');">Cancelar</button></div>';
        
        this.mostrarModal(html);
    }
    
    // Colocar defensa en la aldea
    this.colocarDefensa = function(dominio, defensaId) {
        const maxDefensas = this.cuartelGeneral.niveles[this.datosJugador.cuartelGeneral[dominio].nivel - 1].maxDefensas;
        const nombreBase = this.nombreBasePrincipal[dominio];
        
        if (this.datosJugador.aldea[dominio].length >= maxDefensas) {
            this.mostrarMensaje(`🏰 Máximo de defensas alcanzado (${maxDefensas}). Mejora tu ${nombreBase}.`);
            $('#miModal').modal('hide');
            return;
        }
        
        const nivel = this.datosJugador.defensasDesbloqueadas[defensaId].nivel || 1;
        
        this.datosJugador.aldea[dominio].push({
            id: defensaId,
            nivel: nivel
        });
        
        this.guardarProgreso();
        this.mostrarMensaje('🛡️ ¡Defensa colocada en tu aldea!');
        $('#miModal').modal('hide');
        this.mostrarMiAldea(dominio);
    }
    
    // Mostrar info de una defensa
    this.mostrarInfoDefensa = function(dominio, index) {
        const defAldeaData = this.datosJugador.aldea[dominio][index];
        const defData = this.defensas[dominio].estructuras.find(d => d.id === defAldeaData.id);
        if (!defData) return;
        
        const nivelActual = defAldeaData.nivel;
        const nivelData = defData.niveles[nivelActual - 1];
        const puedeSubir = nivelActual < defData.maxNivel;
        const precioMejora = puedeSubir ? defData.niveles[nivelActual].precioMejora : 0;
        
        let html = `
            <div style="text-align: center;">
                <h2>${defData.emoji} ${defData.nombre}</h2>
                <div class="def-rareza rareza-${defData.rareza.toLowerCase()}">${defData.rareza}</div>
                <p style="color: #aaa;">${defData.descripcion}</p>
                <div style="margin: 15px 0; font-size: 1.2rem;">
                    <p>📊 Nivel: <strong>${nivelActual}/${defData.maxNivel}</strong></p>
                    <p>❤️ Vida: <strong>${nivelData.vida}</strong></p>
                    <p>⚔️ DPS: <strong>${nivelData.dps}</strong></p>
                </div>
                ${puedeSubir ? `
                    <div style="margin: 15px 0;">
                        <p style="color: #7CFC00;">Siguiente nivel:</p>
                        <p>❤️ ${defData.niveles[nivelActual].vida} | ⚔️ ${defData.niveles[nivelActual].dps}</p>
                    </div>
                    <button class="btn btn-success" onclick="cw.mejorarDefensa('${dominio}', ${index})">
                        ⬆️ Mejorar - ${precioMejora.toLocaleString()} 💰
                    </button>
                ` : '<p style="color: gold;">✨ NIVEL MÁXIMO</p>'}
                <button class="btn btn-danger mt-2" onclick="cw.quitarDefensa('${dominio}', ${index})">
                    🗑️ Quitar Defensa
                </button>
                <button class="btn btn-secondary mt-2" onclick="$('#miModal').modal('hide');">Cerrar</button>
            </div>
        `;
        
        this.mostrarModal(html);
    }
    
    // Mejorar defensa
    this.mejorarDefensa = function(dominio, index) {
        const defAldeaData = this.datosJugador.aldea[dominio][index];
        const defData = this.defensas[dominio].estructuras.find(d => d.id === defAldeaData.id);
        
        if (defAldeaData.nivel >= defData.maxNivel) {
            this.mostrarMensaje('⚠️ Esta defensa ya está al máximo nivel');
            return;
        }
        
        const precioMejora = defData.niveles[defAldeaData.nivel].precioMejora;
        
        if (this.datosJugador.monedas >= precioMejora) {
            this.datosJugador.monedas -= precioMejora;
            this.datosJugador.aldea[dominio][index].nivel++;
            
            // También actualizar el nivel en defensasDesbloqueadas
            this.datosJugador.defensasDesbloqueadas[defAldeaData.id].nivel = this.datosJugador.aldea[dominio][index].nivel;
            
            this.actualizarMonedas();
            this.guardarProgreso();
            this.mostrarMensaje(`⬆️ ¡${defData.nombre} mejorado a nivel ${this.datosJugador.aldea[dominio][index].nivel}!`);
            $('#miModal').modal('hide');
            this.mostrarMiAldea(dominio);
        } else {
            this.mostrarMensaje(`❌ Necesitas ${precioMejora.toLocaleString()} monedas`);
        }
    }
    
    // Quitar defensa de la aldea
    this.quitarDefensa = function(dominio, index) {
        this.datosJugador.aldea[dominio].splice(index, 1);
        this.guardarProgreso();
        this.mostrarMensaje('🗑️ Defensa quitada de la aldea');
        $('#miModal').modal('hide');
        this.mostrarMiAldea(dominio);
    }
    
    // Mostrar info del cuartel
    this.mostrarInfoCuartel = function(dominio) {
        const nivelActual = this.datosJugador.cuartelGeneral[dominio].nivel;
        const infoCuartel = this.cuartelGeneral.niveles[nivelActual - 1];
        const puedeSubir = nivelActual < 10;
        const precioSiguiente = puedeSubir ? this.cuartelGeneral.niveles[nivelActual].precio : 0;
        
        const iconosCuartel = {
            tierra: ['🏠', '🏡', '🏘️', '🏰', '🏰', '🏯', '🏯', '🏰', '🏰', '👑'][nivelActual - 1],
            mar: ['⚓', '🚢', '🛳️', '🏗️', '🏭', '🏯', '🏯', '🏰', '🏰', '👑'][nivelActual - 1],
            aire: ['🛩️', '✈️', '🛫', '🏗️', '🏭', '🛡️', '🛡️', '🏰', '🏰', '👑'][nivelActual - 1]
        };
        
        let html = `
            <div style="text-align: center;">
                <h2>${iconosCuartel[dominio]} ${this.nombreBasePrincipal[dominio]}</h2>
                <p style="color: gold; font-size: 1.2rem;">${infoCuartel.descripcion}</p>
                <div style="margin: 15px 0; font-size: 1.1rem;">
                    <p>📊 Nivel: <strong>${nivelActual}/10</strong></p>
                    <p>❤️ Vida: <strong>${infoCuartel.vida.toLocaleString()}</strong></p>
                    <p>🛡️ Máx. Defensas: <strong>${infoCuartel.maxDefensas}</strong></p>
                    <p>🧱 Máx. Muros: <strong>${infoCuartel.maxMuros}</strong></p>
                </div>
                ${puedeSubir ? `
                    <div style="margin: 15px 0; background: rgba(0,100,0,0.3); padding: 10px; border-radius: 10px;">
                        <p style="color: #7CFC00;">📈 Siguiente nivel:</p>
                        <p>❤️ ${this.cuartelGeneral.niveles[nivelActual].vida.toLocaleString()} HP</p>
                        <p>🛡️ ${this.cuartelGeneral.niveles[nivelActual].maxDefensas} Defensas</p>
                        <p>🧱 ${this.cuartelGeneral.niveles[nivelActual].maxMuros} Muros</p>
                    </div>
                    <button class="btn btn-success btn-lg" onclick="cw.mejorarCuartel('${dominio}'); $('#miModal').modal('hide');">
                        ⬆️ Mejorar - ${precioSiguiente.toLocaleString()} 💰
                    </button>
                ` : '<p style="color: gold; font-size: 1.3rem;">👑 ¡NIVEL MÁXIMO!</p>'}
                <br>
                <button class="btn btn-secondary mt-3" onclick="$('#miModal').modal('hide');">Cerrar</button>
            </div>
        `;
        
        this.mostrarModal(html);
    }

    this.setDomainBackground = function(bgClass) {
        this.removeDomainBackground();
        $('body').append(`<div class="domain-fullscreen-bg ${bgClass}" id="domainBg"></div>`);
    }

    this.removeDomainBackground = function() {
        $('#domainBg').remove();
    }

    // ==========================================
    // TIENDA (Ataque + Defensa/Mapas)
    // ==========================================
    
    this.mostrarTienda = function(dominio) {
        this.limpiar();
        
        const temaClases = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };

        const bgClases = {
            tierra: 'domain-bg-tierra',
            mar: 'domain-bg-mar',
            aire: 'domain-bg-aire'
        };

        this.setDomainBackground(bgClases[dominio]);
        
        const dataAtaque = this.unidadesAtaque[dominio];
        const esShooter = dataAtaque && dataAtaque.tipoJuego === 'shooter';
        
        // Nombres para los tabs según el modo
        const nombreUnidades = {
            tierra: '🪖 Soldados',
            mar: '🚢 Naves',
            aire: '✈️ Aeronaves'
        };

        // 🏪 TIENDA MEJORADA - Sin scroll interno, diseño compacto
        const panel = `
            <div class="shop-panel-new ${temaClases[dominio]}">
                <div class="shop-header">
                    <button class="btn-back-shop" id="btnVolverDominio">
                        <span>←</span> Volver
                    </button>
                    <h2 class="shop-title">🏪 Tienda ${dataAtaque.nombre}</h2>
                    <div class="shop-resources">
                        <div class="resource-item coins">
                            <span class="resource-icon">💰</span>
                            <span class="resource-value" id="playerCoins">${this.datosJugador.monedas.toLocaleString()}</span>
                        </div>
                        <div class="resource-item diamonds">
                            <span class="resource-icon">💎</span>
                            <span class="resource-value" id="playerDiamonds">${this.datosJugador.diamantes}</span>
                        </div>
                    </div>
                </div>
                
                <div class="shop-tabs-new">
                    <button class="shop-tab-new active" data-tab="ataque">
                        ${esShooter ? nombreUnidades[dominio] : '⚔️ Unidades'}
                    </button>
                    <button class="shop-tab-new" data-tab="${esShooter ? 'mapas' : 'defensa'}">
                        ${esShooter ? '🗺️ Mapas' : '🛡️ Defensas'}
                    </button>
                </div>
                
                <div class="shop-body" id="shopContent">
                    <!-- Contenido dinámico -->
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        this.mostrarTabTienda(dominio, 'ataque');
        
        $(".shop-tab-new").on("click", function() {
            $(".shop-tab-new").removeClass("active");
            $(this).addClass("active");
            cw.mostrarTabTienda(dominio, $(this).data("tab"));
        });
        
        $("#btnVolverDominio").on("click", () => cw.mostrarMenuDominio(dominio));
    }

    // Generar ilustración del item
    this.generarIlustracion = function(item, tipo) {
        const ilustraciones = {
            // TIERRA - ATAQUE
            'soldier': `<div class="item-illustration tierra"><div class="illust-soldier">👤<div class="illust-helmet">🪖</div><div class="illust-rifle">╾━</div></div></div>`,
            'sniper': `<div class="item-illustration tierra"><div class="illust-sniper">◎━━━━╾</div><div class="illust-scope">🔭</div></div>`,
            'light-tank': `<div class="item-illustration tierra"><div class="illust-tank-light">▄▄▄<br>█▀█<br>◯─◯</div></div>`,
            'heavy-tank': `<div class="item-illustration tierra"><div class="illust-tank-heavy">▄██▄<br>█████<br>◉───◉</div></div>`,
            'war-titan': `<div class="item-illustration tierra mitico"><div class="illust-titan">╔═╗<br>║▓║<br>╟─╢<br>╝ ╚</div></div>`,
            'omega-artillery': `<div class="item-illustration tierra legendario"><div class="illust-artillery">◢███◣<br>║▓▓▓║<br>◎◎◎◎</div></div>`,
            // TIERRA - DEFENSA
            'wooden-wall': `<div class="item-illustration tierra"><div class="illust-wall">┃┃┃┃┃</div></div>`,
            'stone-wall': `<div class="item-illustration tierra"><div class="illust-stone">▓▓▓▓▓</div></div>`,
            'sentry-turret': `<div class="item-illustration tierra"><div class="illust-turret">◢█◣<br>║●║<br>╚═╝</div></div>`,
            'bunker': `<div class="item-illustration tierra"><div class="illust-bunker">▄███▄<br>█▀▀▀█<br>█▄▄▄█</div></div>`,
            'railgun': `<div class="item-illustration tierra mitico"><div class="illust-railgun">═══⚡═══</div></div>`,
            'nemesis-system': `<div class="item-illustration tierra legendario"><div class="illust-nemesis">╱◎╲<br>◎═◎<br>╲◎╱</div></div>`,
            // MAR - ATAQUE
            'patrol-boat': `<div class="item-illustration mar"><div class="illust-boat">▁▂▃▂▁<br>~~~</div></div>`,
            'torpedo-boat': `<div class="item-illustration mar"><div class="illust-torpedo">▁▂▃═══◈<br>≈≈≈</div></div>`,
            'assault-frigate': `<div class="item-illustration mar"><div class="illust-frigate">▄█▀█▄<br>█████<br>≈≈≈≈≈</div></div>`,
            'destroyer': `<div class="item-illustration mar"><div class="illust-destroyer">▄▄███▄▄<br>████████<br>≈≈≈≈≈≈≈≈</div></div>`,
            'mech-kraken': `<div class="item-illustration mar mitico"><div class="illust-kraken">╔◎◎╗<br>╠╬╬╣<br>╝╲╱╚</div></div>`,
            'leviathan': `<div class="item-illustration mar legendario"><div class="illust-leviathan">▄▄▄███▄▄▄<br>███████████<br>≈≈≈≈≈≈≈≈≈≈≈</div></div>`,
            // MAR - DEFENSA
            'minefield': `<div class="item-illustration mar"><div class="illust-mine">◉ ◉ ◉<br>≈≈≈≈≈</div></div>`,
            'gun-platform': `<div class="item-illustration mar"><div class="illust-platform">┌──┐<br>│▓▓│<br>◯══◯</div></div>`,
            'coastal-cannon': `<div class="item-illustration mar"><div class="illust-cannon">◢██◣<br>═══╾</div></div>`,
            'hunter-sub': `<div class="item-illustration mar"><div class="illust-sub">▄▀▀▀▄<br>▀▄▄▄▀</div></div>`,
            'sea-hydra': `<div class="item-illustration mar mitico"><div class="illust-hydra">◎◎◎<br>╲│╱<br>═╬═</div></div>`,
            'ocean-citadel': `<div class="item-illustration mar legendario"><div class="illust-citadel">▄█▀█▀█▄<br>██▓▓▓██<br>≈≈≈≈≈≈≈</div></div>`,
            // AIRE - ATAQUE
            'combat-drone': `<div class="item-illustration aire"><div class="illust-drone">╱◎╲<br>═══</div></div>`,
            'apache': `<div class="item-illustration aire"><div class="illust-heli">──◎──<br>═╤═<br>╱ ╲</div></div>`,
            'interceptor': `<div class="item-illustration aire"><div class="illust-jet">◢▄▄◣<br>◥███◤</div></div>`,
            'bomber': `<div class="item-illustration aire"><div class="illust-bomber">◢▀▀▀▀◣<br>◥█████◤</div></div>`,
            'plasma-phoenix': `<div class="item-illustration aire mitico"><div class="illust-phoenix">╱◎╲<br>╔╬╬╗<br>◤  ◥</div></div>`,
            'stealth-specter': `<div class="item-illustration aire legendario"><div class="illust-stealth">◢▓▓▓▓◣<br>◥▓▓▓▓◤</div></div>`,
            // AIRE - DEFENSA
            'balloon-net': `<div class="item-illustration aire"><div class="illust-balloon">◯ ◯ ◯<br>│ │ │</div></div>`,
            'advanced-radar': `<div class="item-illustration aire"><div class="illust-radar">╱│╲<br>═◎═</div></div>`,
            'fast-aa': `<div class="item-illustration aire"><div class="illust-aa">│◎│<br>╔╩╗<br>╚═╝</div></div>`,
            'missile-vault': `<div class="item-illustration aire"><div class="illust-missile">◢▓◣<br>║▓║<br>║▓║</div></div>`,
            'storm-gen': `<div class="item-illustration aire mitico"><div class="illust-storm">⚡◎⚡<br>╔═╗<br>║▓║</div></div>`,
            'celestial-dome': `<div class="item-illustration aire legendario"><div class="illust-dome">╭━━━╮<br>│◎◎◎│<br>╰━━━╯</div></div>`
        };
        return ilustraciones[item.icono] || `<div class="item-illustration"><span class="illust-emoji">${item.emoji}</span></div>`;
    }

    this.mostrarTabTienda = function(dominio, tab) {
        const container = $("#shopContent");
        let items = [];
        let tipo = '';
        
        // Tab de mapas para shooter
        if (tab === 'mapas') {
            this.mostrarTabMapas(dominio);
            return;
        }
        
        // Tab de skins
        if (tab === 'skins') {
            this.mostrarTabSkins(dominio);
            return;
        }
        
        if (tab === 'ataque') {
            // Para cualquier dominio shooter, usar tropas en lugar de unidades
            const dataAtaque = this.unidadesAtaque[dominio];
            if (dataAtaque && dataAtaque.tipoJuego === 'shooter') {
                items = dataAtaque.tropas || [];
                tipo = 'tropa';
            } else if (dataAtaque && dataAtaque.tipoJuego === 'spaceinvaders') {
                items = dataAtaque.tropas || [];
                tipo = 'avion';
            } else if (dataAtaque && dataAtaque.tipoJuego === 'batallanaval') {
                // Barcos navales
                items = dataAtaque.tropas || [];
                tipo = 'barco';
            } else {
                items = this.unidadesAtaque[dominio]?.unidades || [];
                tipo = 'unidad';
            }
        } else {
            // Tab DEFENSA
            // Para aire (Space Invaders), mostrar skins en lugar de defensas
            if (dominio === 'aire' && this.unidadesAtaque.aire?.skins) {
                items = this.unidadesAtaque.aire.skins || [];
                tipo = 'skin';
            } else {
                items = this.defensas[dominio]?.estructuras || [];
                tipo = 'defensa';
            }
        }

        const dominioDesbloqueado = this.dominioDesbloqueado(dominio);
        
        let html = '<div class="shop-grid">';
        
        items.forEach(item => {
            // Determinar si está desbloqueado según el tipo
            let desbloqueado = false;
            if (tipo === 'unidad') {
                desbloqueado = this.datosJugador.unidadesDesbloqueadas[item.id];
            } else if (tipo === 'tropa') {
                desbloqueado = item.desbloqueado || this.datosJugador.tropasDesbloqueadas?.[item.id];
            } else if (tipo === 'avion') {
                desbloqueado = item.desbloqueado || this.datosJugador.avionesDesbloqueados?.[item.id];
            } else if (tipo === 'barco') {
                // Los barcos navales están desbloqueados por defecto
                desbloqueado = item.desbloqueado || this.datosJugador.barcosDesbloqueados?.[item.id] || true;
            } else if (tipo === 'skin') {
                desbloqueado = item.desbloqueado || this.datosJugador.skinsDesbloqueados?.[item.id];
            } else {
                desbloqueado = this.datosJugador.defensasDesbloqueadas[item.id];
            }
            
            // Verificar si es próximamente
            const esProximamente = item.proximamente === true;
            
            const rarezaClase = {
                'Común': 'rareza-comun',
                'Raro': 'rareza-raro',
                'Épico': 'rareza-epico',
                'Mítico': 'rareza-mitico',
                'Legendario': 'rareza-legendario'
            }[item.rareza] || 'rareza-comun';

            // Un item está bloqueado si el dominio no está desbloqueado Y no es gratis
            const bloqueado = (!dominioDesbloqueado && item.precio > 0) || esProximamente;
            // Un item necesita candado si NO está comprado Y tiene precio > 0
            const necesitaCandado = (!desbloqueado && item.precio > 0) || esProximamente;
            const ilustracion = this.generarIlustracion(item, tipo);
            
            // Obtener stats según tipo
            let statsHTML = '';
            if (tipo === 'defensa' && item.niveles) {
                const nivel1 = item.niveles[0];
                statsHTML = `
                    <div class="card-stats">
                        ${nivel1.dps ? `<span>⚔️ ${nivel1.dps} DPS</span>` : ''}
                        ${nivel1.vida > 0 ? `<span>❤️ ${nivel1.vida}</span>` : '<span>💥 Trampa</span>'}
                    </div>
                    <div class="card-levels">📊 ${item.maxNivel} niveles</div>
                `;
            } else if (item.casillas) {
                // BARCOS NAVALES
                statsHTML = `
                    <div class="card-stats">
                        <span>📏 ${item.casillas} casillas</span>
                        <span>❤️ ${item.vida} vida</span>
                    </div>
                    <div class="card-power">${item.superpoder?.nombre || ''}</div>
                `;
            } else if (tipo === 'avion' && item.stats) {
                // AVIONES SPACE INVADERS
                statsHTML = `
                    <div class="card-stats">
                        <span>❤️ ${item.stats.vida} vidas</span>
                        <span>⚔️ ${item.stats.daño || 10}</span>
                        <span>💨 ${item.stats.velocidad}</span>
                    </div>
                `;
            } else if (tipo === 'skin') {
                // SKINS
                statsHTML = `
                    <div class="card-stats">
                        <span>🎨 Aspecto visual</span>
                    </div>
                    <div class="card-aplica">Aplica a: ${item.aplicaA === 'todos' ? 'Todos los aviones' : item.aplicaA}</div>
                `;
            } else if (item.stats) {
                // TANQUES
                statsHTML = `
                    <div class="card-stats">
                        <span>❤️ ${item.stats.vida}</span>
                        <span>🛡️ ${item.stats.armadura || 0}</span>
                        <span>💨 ${item.stats.velocidad}</span>
                    </div>
                `;
            } else {
                statsHTML = `
                    <div class="card-stats">
                        ${item.ataque ? `<span>⚔️ ${item.ataque}</span>` : ''}
                        <span>❤️ ${item.vida || '?'}</span>
                        ${item.velocidad ? `<span>💨 ${item.velocidad}</span>` : ''}
                    </div>
                `;
            }
            
            // Precio formateado
            let precioHTML = '';
            if (item.precio === 0) {
                precioHTML = '<span class="precio-gratis">¡GRATIS!</span>';
            } else if (item.precioDiamantes > 0) {
                precioHTML = `<span class="precio-oro">${item.precio.toLocaleString()} 💰</span><span class="precio-diamante">+ ${item.precioDiamantes} 💎</span>`;
            } else {
                precioHTML = `<span class="precio-oro">${item.precio.toLocaleString()} 💰</span>`;
            }
            
            let cardClasses = `shop-card ${rarezaClase}`;
            if (desbloqueado) cardClasses += ' owned';
            if (bloqueado) cardClasses += ' locked';
            if (esProximamente) cardClasses += ' proximamente';
            if (!desbloqueado && item.precio > 0) cardClasses += ' not-owned';
            
            html += `
                <div class="${cardClasses}">
                    ${esProximamente ? `
                        <div class="card-lock-overlay proximamente-overlay">
                            <div class="lock-icon">🔮</div>
                            <div class="lock-text proximamente-text">PRÓXIMAMENTE</div>
                        </div>
                    ` : necesitaCandado && !desbloqueado ? `
                        <div class="card-lock-overlay">
                            <div class="lock-icon">🔒</div>
                            ${bloqueado ? '<div class="lock-text">BLOQUEADO</div>' : ''}
                        </div>
                    ` : ''}
                    <div class="card-rareza">${item.rareza || 'Común'}</div>
                    ${ilustracion}
                    <div class="card-emoji">${item.emoji}</div>
                    <div class="card-name">${item.nombre}</div>
                    ${statsHTML}
                    <div class="card-desc">${item.descripcion || ''}</div>
                    ${esProximamente ? `
                        <div class="card-proximamente">🚀 En desarrollo</div>
                    ` : desbloqueado ? `
                        <div class="card-owned">✅ DESBLOQUEADO</div>
                    ` : `
                        <div class="card-price">${precioHTML}</div>
                        <button class="btn-buy" onclick="cw.comprarItem('${item.id}', ${item.precio}, ${item.precioDiamantes || 0}, '${tipo}')" ${bloqueado ? 'disabled' : ''}>
                            ${item.precio === 0 ? '🎁 Obtener' : '🛒 Comprar'}
                        </button>
                    `}
                </div>
            `;
        });
        
        html += '</div>';
        container.html(html);
    }

    this.comprarItem = function(itemId, precioOro, precioDiamantes, tipo) {
        const puedeComprar = this.datosJugador.monedas >= precioOro && this.datosJugador.diamantes >= precioDiamantes;
        
        if (puedeComprar) {
            this.datosJugador.monedas -= precioOro;
            this.datosJugador.diamantes -= precioDiamantes;
            
            if (tipo === 'unidad') {
                this.datosJugador.unidadesDesbloqueadas[itemId] = { nivel: 1 };
            } else if (tipo === 'tropa') {
                if (!this.datosJugador.tropasDesbloqueadas) {
                    this.datosJugador.tropasDesbloqueadas = {};
                }
                this.datosJugador.tropasDesbloqueadas[itemId] = { nivel: 1 };
                // También marcar como desbloqueado en el objeto de tropas
                const tropa = this.unidadesAtaque.tierra.tropas.find(t => t.id === itemId);
                if (tropa) tropa.desbloqueado = true;
            } else {
                // Defensa comprada - guardar con nivel 1
                this.datosJugador.defensasDesbloqueadas[itemId] = { nivel: 1 };
            }
            
            this.actualizarMonedas();
            this.guardarProgreso();
            
            if (tipo === 'defensa') {
                this.mostrarMensaje('🎉 ¡Defensa comprada! Ve a "Mi Aldea" para colocarla.');
            } else if (tipo === 'tropa') {
                this.mostrarMensaje('🎉 ¡Soldado desbloqueado!');
            } else {
                this.mostrarMensaje('🎉 ¡Compra realizada!');
            }
            
            const tabActual = $(".shop-tab.active").data("tab");
            this.mostrarTabTienda(this.dominioActual, tabActual);
        } else {
            if (this.datosJugador.monedas < precioOro) {
                this.mostrarMensaje(`❌ Necesitas ${precioOro.toLocaleString()} monedas de oro`);
            } else {
                this.mostrarMensaje(`❌ Necesitas ${precioDiamantes} diamantes`);
            }
        }
    }
    
    // ==========================================
    // TIENDA - TAB DE MAPAS (Shooter)
    // ==========================================
    
    this.mostrarTabMapas = function(dominio) {
        const container = $("#shopContent");
        const mapas = this.mapasShooter[dominio] || [];
        
        // Agrupar por rareza
        const mapasPorRareza = {
            'Común': mapas.filter(m => m.rareza === 'Común'),
            'Raro': mapas.filter(m => m.rareza === 'Raro'),
            'Épico': mapas.filter(m => m.rareza === 'Épico'),
            'Mítico': mapas.filter(m => m.rareza === 'Mítico'),
            'Legendario': mapas.filter(m => m.rareza === 'Legendario')
        };
        
        let html = '';
        
        Object.entries(mapasPorRareza).forEach(([rareza, mapasRareza]) => {
            if (mapasRareza.length === 0) return;
            
            const rarezaClase = rareza.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            html += `
                <div class="shop-category">
                    <h3 class="category-title rareza-${rarezaClase}">${this.getEmojiRareza(rareza)} ${rareza}</h3>
                    <div class="shop-grid">
            `;
            
            mapasRareza.forEach(mapa => {
                const desbloqueado = mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapa.id);
                const esProximamente = mapa.proximamente === true;
                
                html += `
                    <div class="shop-item rareza-${rarezaClase} ${desbloqueado ? 'owned' : ''} ${esProximamente ? 'proximamente' : ''}">
                        <div class="item-header">
                            <span class="item-emoji">${mapa.emoji}</span>
                            <span class="item-name">${mapa.nombre}</span>
                        </div>
                        <div class="item-body">
                            <p class="item-desc">${mapa.descripcion || ''}</p>
                            ${mapa.config ? `
                                <div class="item-stats">
                                    <span>📐 ${mapa.config.ancho}x${mapa.config.alto}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="item-footer">
                            ${desbloqueado ? `
                                <span class="item-owned">✅ Desbloqueado</span>
                            ` : esProximamente ? `
                                <span class="item-proximamente">🔒 Próximamente</span>
                            ` : `
                                <div class="item-price">
                                    ${mapa.precio > 0 ? `<span class="price-gold">💰 ${mapa.precio.toLocaleString()}</span>` : ''}
                                    ${mapa.precioDiamantes ? `<span class="price-diamonds">💎 ${mapa.precioDiamantes}</span>` : ''}
                                </div>
                                <button class="btn-buy" onclick="cw.comprarMapaTienda('${mapa.id}')">
                                    🔓 Desbloquear
                                </button>
                            `}
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        container.html(html);
    }
    
    this.comprarMapaTienda = function(mapaId, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const mapa = this.mapasShooter[dominio]?.find(m => m.id === mapaId);
        if (!mapa) return;
        
        const precioOro = mapa.precio || 0;
        const precioDiamantes = mapa.precioDiamantes || 0;
        
        const puedeComprar = this.datosJugador.monedas >= precioOro && 
                            this.datosJugador.diamantes >= precioDiamantes;
        
        if (!puedeComprar) {
            if (this.datosJugador.monedas < precioOro) {
                this.mostrarMensaje(`❌ Necesitas ${precioOro.toLocaleString()} monedas de oro`);
            } else {
                this.mostrarMensaje(`❌ Necesitas ${precioDiamantes} diamantes`);
            }
            return;
        }
        
        this.datosJugador.monedas -= precioOro;
        this.datosJugador.diamantes -= precioDiamantes;
        
        if (!this.datosJugador.mapasDesbloqueados) {
            this.datosJugador.mapasDesbloqueados = [];
        }
        this.datosJugador.mapasDesbloqueados.push(mapaId);
        
        this.actualizarMonedas();
        this.guardarProgreso();
        
        this.mostrarMensaje(`🗺️ ¡${mapa.nombre} desbloqueado!`);
        this.mostrarTabMapas(dominio);
    }

    // ==========================================
    // PANEL UN JUGADOR - SHOOTER 1v1
    // ==========================================
    
    this.mostrarPanelUnJugadorDominio = function(dominio) {
        // Todos los dominios usan el panel shooter
        this.mostrarPanelShooterDominio(dominio);
    }
    
    // ==========================================
    // SISTEMA SHOOTER - PANEL PRINCIPAL (Para todos los dominios)
    // ==========================================
    
    this.mostrarPanelShooterDominio = function(dominio) {
        dominio = dominio || 'tierra';
        this.dominioActual = dominio;
        
        // Para AIRE: Mostrar mapa de niveles estilo Candy Crush
        if (dominio === 'aire') {
            this.mostrarMapaNivelesAire();
            return;
        }
        
        // Para MAR: Panel especial sin selección de barco individual
        if (dominio === 'mar') {
            this.mostrarPanelBatallaNaval();
            return;
        }
        
        this.limpiar();
        
        const bgClases = {
            tierra: 'domain-bg-tierra',
            mar: 'domain-bg-mar',
            aire: 'domain-bg-aire'
        };
        this.setDomainBackground(bgClases[dominio]);
        
        const dataUnidades = this.unidadesAtaque[dominio];
        const tropas = dataUnidades.tropas || [];
        const mapas = this.mapasShooter[dominio] || [];
        
        const titulos = {
            tierra: { emoji: '🎖️', titulo: 'TANK STARS', subtitulo: 'TANQUE', descripcion: 'Combate por turnos - Ajusta ángulo y potencia' },
            mar: { emoji: '🚢', titulo: 'BATALLA NAVAL', subtitulo: 'BARCO', descripcion: 'Hundir la flota enemiga - Estrategia naval' },
            aire: { emoji: '✈️', titulo: 'SPACE INVADERS', subtitulo: 'NAVE', descripcion: 'Destruye las oleadas de enemigos' }
        };
        const info = titulos[dominio];
        
        const panel = `
            <div class="minigame-panel dominio-${dominio}">
                <!-- HEADER -->
                <div class="minigame-header">
                    <button class="btn-back-mini" id="btnVolverDominio">← Volver</button>
                    <div class="minigame-title">
                        <span class="title-emoji">${info.emoji}</span>
                        <div class="title-text">
                            <h2>${info.titulo}</h2>
                            <p>${info.descripcion}</p>
                        </div>
                    </div>
                    <div class="minigame-resources">
                        <span class="resource">💰 ${this.datosJugador.monedas?.toLocaleString() || 0}</span>
                        <span class="resource">💎 ${this.datosJugador.diamantes || 0}</span>
                    </div>
                </div>
                
                <!-- CONTENIDO PRINCIPAL - LAYOUT HORIZONTAL -->
                <div class="minigame-content">
                    <!-- COLUMNA IZQUIERDA: Personajes -->
                    <div class="minigame-column personajes-column">
                        <h3>🎯 ELIGE TU ${info.subtitulo}</h3>
                        <div class="personajes-lista">
                            ${tropas.filter(t => !t.proximamente).map(tropa => {
                                // Obtener vida y daño según el tipo de tropa
                                const vida = tropa.stats?.vida || tropa.vida || tropa.casillas || '?';
                                const daño = tropa.stats?.daño || tropa.armas?.[0]?.daño || tropa.superpoder?.area || '⚡';
                                return `
                                <div class="personaje-card ${tropa.desbloqueado ? '' : 'bloqueado'}" 
                                     data-tropa="${tropa.id}" onclick="cw.seleccionarPersonaje('${tropa.id}', '${dominio}')">
                                    <div class="personaje-avatar">${tropa.emoji}</div>
                                    <div class="personaje-info">
                                        <span class="personaje-nombre">${tropa.nombre}</span>
                                        <span class="personaje-rareza rareza-${(tropa.rareza || 'Común').toLowerCase()}">${tropa.rareza || 'Común'}</span>
                                        <div class="personaje-stats">
                                            <span>❤️${vida}</span>
                                            <span>💪${daño}</span>
                                        </div>
                                    </div>
                                    ${!tropa.desbloqueado ? `<div class="personaje-lock">🔒 💰${tropa.precio}</div>` : ''}
                                </div>
                            `}).join('')}
                        </div>
                    </div>
                    
                    <!-- COLUMNA CENTRAL: Mapas (HORIZONTAL) -->
                    <div class="minigame-column mapas-column">
                        <h3>🗺️ CAMPO DE BATALLA</h3>
                        <div class="mapas-horizontal-scroll">
                            <div class="mapas-horizontal">
                                ${mapas.map(mapa => {
                                    const esProximamente = mapa.proximamente === true;
                                    const desbloqueado = !esProximamente && (mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapa.id));
                                    const claseExtra = esProximamente ? 'proximamente' : (desbloqueado ? '' : 'bloqueado');
                                    return `
                                    <div class="mapa-card-horizontal ${claseExtra} rareza-${mapa.rareza.toLowerCase()}"
                                         data-mapa="${mapa.id}" onclick="${esProximamente ? '' : `cw.seleccionarMapa('${mapa.id}', '${dominio}')`}">
                                        <div class="mapa-preview" style="background: ${this.getMapaBackground(mapa)}">
                                            <span class="mapa-emoji-big">${mapa.emoji}</span>
                                            ${esProximamente ? '<div class="proximamente-badge">🔮 PRÓXIMAMENTE</div>' : ''}
                                        </div>
                                        <div class="mapa-info">
                                            <span class="mapa-nombre">${mapa.nombre}</span>
                                            <span class="mapa-rareza">${mapa.rareza}</span>
                                        </div>
                                        ${esProximamente ? '' : (!desbloqueado ? `<div class="mapa-lock">🔒 💰${mapa.precio}</div>` : '')}
                                    </div>
                                `}).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- COLUMNA DERECHA: Info y Acción -->
                    <div class="minigame-column accion-column">
                        <h3>⚔️ CONFIGURACIÓN</h3>
                        
                        <!-- Resumen de selección -->
                        <div class="seleccion-resumen" id="seleccionResumen">
                            <div class="resumen-item">
                                <span class="resumen-label">${info.subtitulo}:</span>
                                <span class="resumen-valor" id="resumenPersonaje">Sin seleccionar</span>
                            </div>
                            <div class="resumen-item">
                                <span class="resumen-label">Mapa:</span>
                                <span class="resumen-valor" id="resumenMapa">Sin seleccionar</span>
                            </div>
                        </div>
                        
                        <!-- Selector de dificultad IA -->
                        <div class="dificultad-selector">
                            <span class="dificultad-label">🤖 Dificultad IA:</span>
                            <div class="dificultad-opciones" id="dificultadOpciones">
                                <button class="dificultad-btn facil seleccionada" data-dificultad="facil" onclick="cw.seleccionarDificultad('facil')">
                                    <span class="dif-emoji">🌱</span>
                                    <span class="dif-nombre">Fácil</span>
                                </button>
                                <button class="dificultad-btn normal" data-dificultad="normal" onclick="cw.seleccionarDificultad('normal')">
                                    <span class="dif-emoji">⭐</span>
                                    <span class="dif-nombre">Normal</span>
                                </button>
                                <button class="dificultad-btn dificil" data-dificultad="dificil" onclick="cw.seleccionarDificultad('dificil')">
                                    <span class="dif-emoji">🔥</span>
                                    <span class="dif-nombre">Difícil</span>
                                </button>
                                <button class="dificultad-btn experto" data-dificultad="experto" onclick="cw.seleccionarDificultad('experto')">
                                    <span class="dif-emoji">💀</span>
                                    <span class="dif-nombre">Experto</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="acciones-botones">
                            <button class="btn-jugar ${dominio}" id="btnIniciarJuego" disabled>
                                🎮 ¡JUGAR vs IA!
                            </button>
                            <button class="btn-instrucciones" onclick="cw.mostrarInstrucciones('${dominio}')">
                                ❓ Cómo Jugar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        // Inicializar selecciones
        this.shooterSeleccion = { tropa: null, mapa: null, dominio: dominio, dificultad: 'facil' };
        
        // Inicializar array de mapas si no existe (incluye mapas iniciales de cada dominio)
        if (!this.datosJugador.mapasDesbloqueados) {
            this.datosJugador.mapasDesbloqueados = [
                // Tierra (Tank Stars)
                'valle_verde', 'desierto_dunas', 'pradera_flores',
                // Mar (Batalla Naval)
                'oceano_abierto', 'bahia_tranquila', 
                // Aire (Space Invaders)
                'cielo_despejado', 'entre_nubes'
            ];
        }
        
        $("#btnVolverDominio").on("click", () => cw.mostrarMenuDominio(dominio));
        
        $("#btnIniciarJuego").on("click", () => {
            // Verificación final antes de iniciar partida
            const verificacion = this.verificarComprasParaPartida(dominio);
            if (!verificacion.valido) {
                this.mostrarMensaje(verificacion.mensaje);
                return;
            }
            
            if (this.shooterSeleccion.tropa && this.shooterSeleccion.mapa) {
                // Cada dominio tiene su propio juego
                if (dominio === 'tierra') {
                    this.iniciarTankStars(this.shooterSeleccion.tropa, this.shooterSeleccion.mapa, this.shooterSeleccion.dificultad);
                } else if (dominio === 'aire') {
                    this.iniciarSpaceInvaders(this.shooterSeleccion.tropa, this.shooterSeleccion.mapa, this.shooterSeleccion.dificultad);
                } else if (dominio === 'mar') {
                    this.iniciarBatallaNaval(this.shooterSeleccion.tropa, this.shooterSeleccion.mapa, this.shooterSeleccion.dificultad);
                }
            }
        });
        
        // Auto-seleccionar primera tropa desbloqueada (que no sea próximamente)
        const tropaInicial = tropas.find(t => t.desbloqueado && !t.proximamente);
        if (tropaInicial) {
            this.seleccionarPersonaje(tropaInicial.id, dominio);
        }
        
        // Auto-seleccionar primer mapa desbloqueado (que no sea próximamente)
        const mapaInicial = mapas.find(m => !m.proximamente && (m.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(m.id)));
        if (mapaInicial) {
            this.seleccionarMapa(mapaInicial.id, dominio);
        }
    }
    
    this.getMapaBackground = function(mapa) {
        // Si el mapa tiene un fondo definido en su config, usarlo
        if (mapa.config?.fondo) {
            return mapa.config.fondo;
        }
        
        // Si tiene colores de cielo definidos, crear gradiente
        if (mapa.config?.colores?.cielo) {
            const colores = mapa.config.colores.cielo;
            if (Array.isArray(colores)) {
                return `linear-gradient(180deg, ${colores[0]} 0%, ${colores[1] || colores[0]} 50%, ${colores[2] || colores[1] || colores[0]} 100%)`;
            }
        }
        
        // Fondos por ID específico (para mapas sin config.fondo)
        const fondos = {
            // ===== TIERRA =====
            'valle_verde': 'linear-gradient(180deg, #87CEEB 0%, #5BA3D6 50%, #4CAF50 100%)',
            'desierto_dunas': 'linear-gradient(180deg, #F4A460 0%, #DEB887 50%, #C4A76C 100%)',
            'pradera_flores': 'linear-gradient(180deg, #87CEEB 0%, #ADD8E6 50%, #7CB342 100%)',
            'montanas_rocosas': 'linear-gradient(180deg, #708090 0%, #5F6F7A 50%, #4A5568 100%)',
            'pantano_niebla': 'linear-gradient(180deg, #2F4F4F 0%, #3D5C5C 50%, #3E5C3E 100%)',
            'canyon_rojo': 'linear-gradient(180deg, #FF6B35 0%, #CD5C5C 50%, #8B4513 100%)',
            'tundra_helada': 'linear-gradient(180deg, #B0E0E6 0%, #87CEEB 50%, #E0FFFF 100%)',
            'volcan_activo': 'linear-gradient(180deg, #1a1a2e 0%, #641E16 50%, #ff4500 100%)',
            'islas_flotantes': 'linear-gradient(180deg, #1a1a4e 0%, #2a2a6e 50%, #4CAF50 100%)',
            'trincheras_wwi': 'linear-gradient(180deg, #4a4a4a 0%, #5D4037 50%, #3E2723 100%)',
            'ciudad_destruida': 'linear-gradient(180deg, #2c2c2c 0%, #3c3c3c 50%, #424242 100%)',
            'zona_nuclear': 'linear-gradient(180deg, #1a3a1a 0%, #7fff00 30%, #2e3d2e 100%)',
            'luna_marte': 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #9e9e9e 100%)',
            'infierno': 'linear-gradient(180deg, #1a0000 0%, #ff0000 50%, #ff4500 100%)',
            
            // ===== MAR =====
            'oceano_abierto': 'linear-gradient(180deg, #87CEEB 0%, #1E90FF 40%, #006994 100%)',
            'bahia_tranquila': 'linear-gradient(180deg, #87CEEB 0%, #40E0D0 50%, #008B8B 100%)',
            'puerto_abandonado': 'linear-gradient(180deg, #708090 0%, #4682B4 50%, #2F4F4F 100%)',
            'archipielago': 'linear-gradient(180deg, #87CEEB 0%, #00CED1 40%, #008B8B 100%)',
            'estrecho_gibraltar': 'linear-gradient(180deg, #5F9EA0 0%, #008B8B 100%)',
            'arrecife_coral': 'linear-gradient(180deg, #00CED1 0%, #20B2AA 50%, #008080 100%)',
            'tormenta_perfecta': 'linear-gradient(180deg, #2F4F4F 0%, #1C1C1C 50%, #000033 100%)',
            'icebergs': 'linear-gradient(180deg, #B0E0E6 0%, #87CEEB 30%, #4169E1 100%)',
            'fosa_abisal': 'linear-gradient(180deg, #006994 0%, #001a33 50%, #000011 100%)',
            'triangulo_bermudas': 'linear-gradient(180deg, #4B0082 0%, #191970 50%, #000033 100%)',
            
            // ===== AIRE =====
            'cielo_despejado': 'linear-gradient(180deg, #1E90FF 0%, #87CEEB 50%, #B0E0E6 100%)',
            'entre_nubes': 'linear-gradient(180deg, #4169E1 0%, #87CEEB 50%, #FFFFFF 100%)',
            'sobre_montanas': 'linear-gradient(180deg, #4169E1 0%, #87CEEB 60%, #228B22 100%)',
            'cañon_aereo': 'linear-gradient(180deg, #87CEEB 0%, #DEB887 60%, #8B4513 100%)',
            'tormenta_electrica': 'linear-gradient(180deg, #2F4F4F 0%, #4A5568 50%, #1A1A2E 100%)',
            'ciudad_flotante': 'linear-gradient(180deg, #FFD700 0%, #FF8C00 30%, #4169E1 100%)',
            'zona_guerra_aerea': 'linear-gradient(180deg, #696969 0%, #808080 50%, #2F4F4F 100%)',
            'aurora_boreal': 'linear-gradient(180deg, #00FF7F 0%, #9400D3 50%, #000033 100%)',
            'espacio_cercano': 'linear-gradient(180deg, #000000 0%, #1a1a4e 50%, #4169E1 100%)'
        };
        
        return fondos[mapa.id] || 'linear-gradient(180deg, #333 0%, #111 100%)';
    }
    
    // ==========================================
    // MAPA DE NIVELES ESTILO CANDY CRUSH - AIRE
    // 50 niveles, 3 oleadas cada uno
    // ==========================================
    
    this.mostrarMapaNivelesAire = function() {
        this.limpiar();
        this.setDomainBackground('domain-bg-aire');
        
        const totalNiveles = 10;
        const nivelActual = this.datosJugador.nivelAire || 1;
        const estrellasPorNivel = this.datosJugador.estrellasAire || {};
        
        // Generar niveles en línea horizontal
        let nivelesHTML = '';
        for (let i = 1; i <= totalNiveles; i++) {
            const desbloqueado = i <= nivelActual;
            const completado = i < nivelActual;
            const esActual = i === nivelActual;
            const estrellas = estrellasPorNivel[i] || 0;
            
            // Posición en zigzag simple para 10 niveles
            const fila = Math.floor((i - 1) / 5);
            const posEnFila = (i - 1) % 5;
            const direccion = fila % 2 === 0 ? 1 : -1;
            const columna = direccion === 1 ? posEnFila : (4 - posEnFila);
            
            // Calcular offsets para efecto de camino curvo
            const offsetY = Math.sin((i / 2) * Math.PI) * 10;
            const offsetX = 0;
            
            // Determinar tema visual cada 5 niveles
            const zona = Math.floor((i - 1) / 5);
            const temas = ['cielo', 'espacio'];
            const tema = temas[zona] || 'espacio';
            
            // Estrellas visuales
            let estrellasHTML = '';
            if (completado || esActual) {
                estrellasHTML = `
                    <div class="nivel-estrellas">
                        ${estrellas >= 1 ? '⭐' : '☆'}${estrellas >= 2 ? '⭐' : '☆'}${estrellas >= 3 ? '⭐' : '☆'}
                    </div>
                `;
            }
            
            // Clase del nivel
            let claseNivel = 'nivel-node';
            if (completado) claseNivel += ' completado';
            else if (esActual) claseNivel += ' actual';
            else claseNivel += ' bloqueado';
            claseNivel += ` tema-${tema}`;
            
            // Icono del nivel
            let icono = '🔒';
            if (completado) icono = '✅';
            else if (esActual) icono = '🎮';
            
            // Nivel 5 y 10 son boss
            const esBoss = i === 5 || i === 10;
            if (esBoss) {
                claseNivel += ' boss';
                if (esActual) icono = '👾';
                else if (completado) icono = '🏆';
            }
            
            nivelesHTML += `
                <div class="${claseNivel}" 
                     data-nivel="${i}"
                     style="grid-column: ${columna + 1}; transform: translate(${offsetX}px, ${offsetY}px);"
                     onclick="${desbloqueado ? `cw.seleccionarNivelAire(${i})` : ''}">
                    <div class="nivel-numero">${i}</div>
                    <div class="nivel-icono">${esBoss ? '👾' : icono}</div>
                    ${estrellasHTML}
                    ${esBoss ? `<div class="boss-badge">BOSS</div>` : ''}
                </div>
            `;
        }
        
        // Panel completo
        const panel = `
            <div class="niveles-aire-container">
                <!-- Header -->
                <div class="niveles-header">
                    <button class="btn-back-mini" id="btnVolverDominio">← Volver</button>
                    <div class="niveles-titulo">
                        <span class="titulo-emoji">🚀</span>
                        <div class="titulo-text">
                            <h2>SPACE INVADERS</h2>
                            <p>Completa los 10 niveles • 3 oleadas por nivel</p>
                        </div>
                    </div>
                    <div class="niveles-stats">
                        <span class="stat">📊 Nivel ${nivelActual}/10</span>
                        <span class="stat">⭐ ${Object.values(estrellasPorNivel).reduce((a, b) => a + b, 0)}/30</span>
                    </div>
                </div>
                
                <!-- Mapa de niveles con scroll -->
                <div class="niveles-mapa-scroll">
                    <div class="niveles-mapa">
                        <!-- Fondo decorativo -->
                        <div class="mapa-fondo">
                            <div class="estrella-bg"></div>
                            <div class="estrella-bg"></div>
                            <div class="estrella-bg"></div>
                            <div class="planeta-bg">🪐</div>
                            <div class="planeta-bg">🌙</div>
                        </div>
                        
                        <!-- Camino de niveles -->
                        <div class="niveles-camino">
                            ${nivelesHTML}
                        </div>
                        
                        <!-- Zonas temáticas -->
                        <div class="zonas-marcadores">
                            <div class="zona-marcador zona-1">☁️ Cielo<br>Niveles 1-5</div>
                            <div class="zona-marcador zona-2">🌌 Espacio<br>Niveles 6-10</div>
                        </div>
                    </div>
                </div>
                
                <!-- Panel de nivel seleccionado -->
                <div class="nivel-info-panel" id="nivelInfoPanel" style="display: none;">
                    <div class="nivel-info-content">
                        <h3 id="nivelTitulo">Nivel 1</h3>
                        <div class="nivel-detalles">
                            <p id="nivelDescripcion">3 oleadas de enemigos</p>
                            <div class="nivel-recompensas">
                                <span>🏆 Recompensas:</span>
                                <span id="nivelRecompensas">+50 💰 | +10 ⭐</span>
                            </div>
                        </div>
                        <div class="nivel-acciones">
                            <button class="btn-jugar-nivel aire" id="btnJugarNivel">
                                🎮 ¡JUGAR!
                            </button>
                            <button class="btn-cerrar-info" onclick="$('#nivelInfoPanel').hide()">
                                ✕ Cerrar
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Recursos -->
                <div class="niveles-footer">
                    <div class="recursos">
                        <span class="recurso">💰 ${this.datosJugador.monedas?.toLocaleString() || 0}</span>
                        <span class="recurso">💎 ${this.datosJugador.diamantes || 0}</span>
                        <span class="recurso">❤️ ${this.datosJugador.vidasAire || 5} vidas</span>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        // Inicializar vidas si no existen
        if (!this.datosJugador.vidasAire) {
            this.datosJugador.vidasAire = 5;
        }
        if (!this.datosJugador.nivelAire) {
            this.datosJugador.nivelAire = 1;
        }
        if (!this.datosJugador.estrellasAire) {
            this.datosJugador.estrellasAire = {};
        }
        
        // Scroll al nivel actual
        setTimeout(() => {
            const nivelActualElement = $(`.nivel-node.actual`);
            if (nivelActualElement.length) {
                nivelActualElement[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        
        // Eventos
        $("#btnVolverDominio").on("click", () => this.mostrarMenuDominio('aire'));
    }
    
    // ==========================================
    // PANEL ESPECIAL BATALLA NAVAL
    // Muestra la flota completa, no selección individual
    // ==========================================
    
    this.mostrarPanelBatallaNaval = function() {
        this.limpiar();
        this.setDomainBackground('domain-bg-mar');
        
        const mapas = this.mapasShooter.mar || [];
        
        // Definición de la flota (los 7 barcos que se usan) - Categorías actualizadas
        const flota = [
            { nombre: 'Lancha', emoji: '🚤', tamaño: 1, rareza: 'Común', superpoder: '🎯 Disparo Preciso' },
            { nombre: 'Patrullero', emoji: '🛥️', tamaño: 2, rareza: 'Común', superpoder: '💣 Disparo Doble' },
            { nombre: 'Destructor', emoji: '🚢', tamaño: 3, rareza: 'Raro', superpoder: '🌊 Torpedo Triple' },
            { nombre: 'Crucero', emoji: '⛴️', tamaño: 4, rareza: 'Épico', superpoder: '🎯 Bombardeo 2x2' },
            { nombre: 'Acorazado', emoji: '🛳️', tamaño: 5, rareza: 'Épico', superpoder: '☄️ Misil 3x3' },
            { nombre: 'Portaaviones', emoji: '🚀', tamaño: 6, rareza: 'Mítico', superpoder: '✈️ Ataque 4x4' },
            { nombre: 'Dreadnought', emoji: '⚓', tamaño: 7, rareza: 'Legendario', superpoder: '💀 Aniquilación 5x5' }
        ];
        
        const panel = `
            <div class="minigame-panel dominio-mar naval-panel">
                <!-- HEADER -->
                <div class="minigame-header">
                    <button class="btn-back-mini" id="btnVolverDominio">← Volver</button>
                    <div class="minigame-title">
                        <span class="title-emoji">🚢</span>
                        <div class="title-text">
                            <h2>BATALLA NAVAL</h2>
                            <p>Hundir la flota enemiga - 7 barcos por bando</p>
                        </div>
                    </div>
                    <div class="minigame-resources">
                        <span class="resource">💰 ${this.datosJugador.monedas?.toLocaleString() || 0}</span>
                        <span class="resource">💎 ${this.datosJugador.diamantes || 0}</span>
                    </div>
                </div>
                
                <div class="minigame-content naval-content">
                    <!-- COLUMNA IZQUIERDA: Tu Flota -->
                    <div class="minigame-column flota-column">
                        <h3>⚓ TU FLOTA (7 Barcos)</h3>
                        <div class="flota-lista">
                            ${flota.map(barco => `
                                <div class="flota-barco-card rareza-${barco.rareza.toLowerCase()}">
                                    <div class="barco-emoji">${barco.emoji}</div>
                                    <div class="barco-info">
                                        <span class="barco-nombre">${barco.nombre}</span>
                                        <span class="barco-size">${barco.tamaño} casilla${barco.tamaño > 1 ? 's' : ''}</span>
                                    </div>
                                    <div class="barco-poder" title="${barco.superpoder}">
                                        ${barco.superpoder.split(' ')[0]}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="energia-info">
                            <span>⚡ Energía máxima: <strong>7</strong></span>
                            <p>Impacta enemigos para cargar superpoderes</p>
                        </div>
                    </div>
                    
                    <!-- COLUMNA CENTRAL: Mapas -->
                    <div class="minigame-column mapas-column">
                        <h3>🗺️ CAMPO DE BATALLA</h3>
                        <div class="mapas-horizontal-scroll">
                            <div class="mapas-horizontal">
                                ${mapas.map(mapa => {
                                    const esProximamente = mapa.proximamente === true;
                                    const desbloqueado = !esProximamente && (mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapa.id));
                                    const claseExtra = esProximamente ? 'proximamente' : (desbloqueado ? '' : 'bloqueado');
                                    return `
                                    <div class="mapa-card-horizontal ${claseExtra} rareza-${mapa.rareza.toLowerCase()}"
                                         data-mapa="${mapa.id}" onclick="${esProximamente ? '' : `cw.seleccionarMapaNaval('${mapa.id}')`}">
                                        <div class="mapa-preview" style="background: ${this.getMapaBackground(mapa)}">
                                            <span class="mapa-emoji-big">${mapa.emoji}</span>
                                            ${esProximamente ? '<div class="proximamente-badge">🔮 PRÓXIMAMENTE</div>' : ''}
                                        </div>
                                        <div class="mapa-info">
                                            <span class="mapa-nombre">${mapa.nombre}</span>
                                            <span class="mapa-rareza">${mapa.rareza}</span>
                                        </div>
                                        ${esProximamente ? '' : (!desbloqueado ? `<div class="mapa-lock">🔒 💰${mapa.precio}</div>` : '')}
                                    </div>
                                `}).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- COLUMNA DERECHA: Configuración -->
                    <div class="minigame-column accion-column">
                        <h3>⚔️ CONFIGURACIÓN</h3>
                        
                        <div class="seleccion-resumen" id="seleccionResumen">
                            <div class="resumen-item">
                                <span class="resumen-label">Mapa:</span>
                                <span class="resumen-valor" id="resumenMapa">Sin seleccionar</span>
                            </div>
                            <div class="resumen-item">
                                <span class="resumen-label">Flota:</span>
                                <span class="resumen-valor">7 Barcos listos ⚓</span>
                            </div>
                        </div>
                        
                        <div class="dificultad-selector">
                            <span class="dificultad-label">🤖 Dificultad IA:</span>
                            <div class="dificultad-opciones" id="dificultadOpciones">
                                <button class="dificultad-btn facil seleccionada" data-dificultad="facil" onclick="cw.seleccionarDificultadNaval('facil')">
                                    <span class="dif-emoji">🌱</span>
                                    <span class="dif-nombre">Fácil</span>
                                </button>
                                <button class="dificultad-btn normal" data-dificultad="normal" onclick="cw.seleccionarDificultadNaval('normal')">
                                    <span class="dif-emoji">⭐</span>
                                    <span class="dif-nombre">Normal</span>
                                </button>
                                <button class="dificultad-btn dificil" data-dificultad="dificil" onclick="cw.seleccionarDificultadNaval('dificil')">
                                    <span class="dif-emoji">🔥</span>
                                    <span class="dif-nombre">Difícil</span>
                                </button>
                                <button class="dificultad-btn experto" data-dificultad="experto" onclick="cw.seleccionarDificultadNaval('experto')">
                                    <span class="dif-emoji">💀</span>
                                    <span class="dif-nombre">Experto</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="acciones-botones">
                            <button class="btn-jugar mar" id="btnIniciarNaval" disabled>
                                🎮 ¡JUGAR vs IA!
                            </button>
                            <button class="btn-instrucciones" onclick="cw.mostrarInstrucciones('mar')">
                                ❓ Cómo Jugar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        // Inicializar selección naval
        this.navalSeleccion = { mapa: null, dificultad: 'facil' };
        
        // Auto-seleccionar primer mapa desbloqueado
        const mapaInicial = mapas.find(m => !m.proximamente && (m.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(m.id)));
        if (mapaInicial) {
            this.seleccionarMapaNaval(mapaInicial.id);
        }
        
        $("#btnVolverDominio").on("click", () => this.mostrarMenuDominio('mar'));
        
        $("#btnIniciarNaval").on("click", () => {
            if (this.navalSeleccion.mapa) {
                this.iniciarBatallaNaval('flota_completa', this.navalSeleccion.mapa, this.navalSeleccion.dificultad);
            }
        });
    }
    
    this.seleccionarMapaNaval = function(mapaId) {
        const mapas = this.mapasShooter.mar || [];
        const mapa = mapas.find(m => m.id === mapaId);
        
        if (!mapa) return;
        
        const desbloqueado = mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapaId);
        if (!desbloqueado) {
            this.mostrarMensaje('🔒 Debes comprar este mapa en la tienda');
            return;
        }
        
        // Actualizar UI
        $('.mapa-card-horizontal').removeClass('seleccionado');
        $(`.mapa-card-horizontal[data-mapa="${mapaId}"]`).addClass('seleccionado');
        
        this.navalSeleccion.mapa = mapaId;
        $('#resumenMapa').html(`${mapa.emoji} ${mapa.nombre}`);
        
        // Habilitar botón
        $('#btnIniciarNaval').prop('disabled', false);
    }
    
    this.seleccionarDificultadNaval = function(dificultad) {
        $('.dificultad-btn').removeClass('seleccionada');
        $(`.dificultad-btn[data-dificultad="${dificultad}"]`).addClass('seleccionada');
        this.navalSeleccion.dificultad = dificultad;
    }

    this.seleccionarNivelAire = function(nivel) {
        const nivelActual = this.datosJugador.nivelAire || 1;
        
        if (nivel > nivelActual) {
            this.mostrarMensaje('🔒 Completa los niveles anteriores primero');
            return;
        }
        
        // Mostrar panel de info del nivel
        const esBoss = nivel % 10 === 0;
        const zona = Math.floor((nivel - 1) / 10);
        const zonas = ['Cielo Terrestre', 'Zona de Tormentas', 'Alta Atmósfera', 'Espacio Cercano', 'Galaxia Profunda'];
        
        const recompensaBase = 50 + (nivel * 5);
        const xpBase = 10 + (nivel * 2);
        
        $('#nivelTitulo').text(`Nivel ${nivel}${esBoss ? ' - 👾 BOSS' : ''}`);
        $('#nivelDescripcion').html(`
            <p>📍 ${zonas[zona]}</p>
            <p>🌊 3 oleadas de enemigos${esBoss ? ' + JEFE FINAL' : ''}</p>
            <p>💀 Dificultad: ${'⭐'.repeat(Math.min(5, Math.ceil(nivel / 10)))}</p>
        `);
        $('#nivelRecompensas').text(`+${recompensaBase} 💰 | +${xpBase} ⭐`);
        
        $('#btnJugarNivel').off('click').on('click', () => {
            this.iniciarNivelAire(nivel);
        });
        
        // Marcar nivel seleccionado
        $('.nivel-node').removeClass('seleccionado');
        $(`.nivel-node[data-nivel="${nivel}"]`).addClass('seleccionado');
        
        $('#nivelInfoPanel').fadeIn(200);
    }
    
    this.iniciarNivelAire = function(nivel) {
        // Verificar vidas
        if (this.datosJugador.vidasAire <= 0) {
            this.mostrarModal(`
                <div style="text-align: center;">
                    <h2>💔 Sin Vidas</h2>
                    <p>Has agotado tus vidas.</p>
                    <p>Espera a que se regeneren o compra más.</p>
                    <button class="btn btn-primary mt-3" onclick="$('#miModal').modal('hide');">
                        Entendido
                    </button>
                </div>
            `);
            return;
        }
        
        // Gastar una vida
        this.datosJugador.vidasAire--;
        
        // Iniciar Space Invaders con el nivel especificado
        this.iniciarSpaceInvaders('caza_espacial', 'cielo_despejado', 'normal', nivel);
    }

    this.seleccionarPersonaje = function(tropaId, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const tropa = tropas.find(t => t.id === tropaId);
        
        if (!tropa) return;
        
        if (!tropa.desbloqueado) {
            this.mostrarMensaje('🔒 Debes desbloquear este personaje primero');
            return;
        }
        
        // Actualizar UI
        $('.personaje-card').removeClass('seleccionado');
        $(`.personaje-card[data-tropa="${tropaId}"]`).addClass('seleccionado');
        
        this.shooterSeleccion.tropa = tropaId;
        $('#resumenPersonaje').html(`${tropa.emoji} ${tropa.nombre}`);
        
        this.actualizarBotonJugar();
    }
    
    this.seleccionarMapa = function(mapaId, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const mapas = this.mapasShooter[dominio] || [];
        const mapa = mapas.find(m => m.id === mapaId);
        
        if (!mapa) return;
        
        const desbloqueado = mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapaId);
        
        if (!desbloqueado) {
            this.mostrarComprarMapa(mapa, dominio);
            return;
        }
        
        // Actualizar UI
        $('.mapa-card-horizontal').removeClass('seleccionado');
        $(`.mapa-card-horizontal[data-mapa="${mapaId}"]`).addClass('seleccionado');
        
        this.shooterSeleccion.mapa = mapaId;
        $('#resumenMapa').html(`${mapa.emoji} ${mapa.nombre}`);
        
        this.actualizarBotonJugar();
    }
    
    this.actualizarBotonJugar = function() {
        const listo = this.shooterSeleccion.tropa && this.shooterSeleccion.mapa;
        $('#btnIniciarJuego').prop('disabled', !listo);
        if (listo) {
            $('#btnIniciarJuego').addClass('listo');
        } else {
            $('#btnIniciarJuego').removeClass('listo');
        }
    }
    
    this.seleccionarDificultad = function(dificultad) {
        this.shooterSeleccion.dificultad = dificultad;
        
        // Actualizar UI
        $('.dificultad-btn').removeClass('seleccionada');
        $(`.dificultad-btn[data-dificultad="${dificultad}"]`).addClass('seleccionada');
        
        // Mostrar descripción
        const descripciones = {
            facil: '🌱 IA básica - Ideal para aprender',
            normal: '⭐ IA equilibrada - Desafío moderado',
            dificil: '🔥 IA agresiva - Para expertos',
            experto: '💀 IA perfecta - ¡Buena suerte!'
        };
        
        this.mostrarMensaje(descripciones[dificultad] || '');
    }
    
    this.mostrarInstrucciones = function(dominio) {
        const instrucciones = {
            tierra: `
                <h3>🎖️ TANK STARS - Instrucciones</h3>
                <div class="instrucciones-content">
                    <p><strong>Objetivo:</strong> Destruir el tanque enemigo antes de que te destruya a ti.</p>
                    <h4>Controles:</h4>
                    <ul>
                        <li>⬅️➡️ <strong>Flechas</strong>: Ajustar ángulo de disparo</li>
                        <li>⬆️⬇️ <strong>Arriba/Abajo</strong>: Ajustar potencia</li>
                        <li>🔥 <strong>ESPACIO</strong>: Disparar</li>
                        <li>1-2 <strong>Números</strong>: Cambiar arma</li>
                    </ul>
                    <p>¡Los proyectiles siguen trayectorias parabólicas! Considera el viento y los obstáculos.</p>
                </div>
            `,
            aire: `
                <h3>✈️ SPACE INVADERS - Instrucciones</h3>
                <div class="instrucciones-content">
                    <p><strong>Objetivo:</strong> Destruir todas las oleadas de enemigos sin que te alcancen.</p>
                    <h4>Controles:</h4>
                    <ul>
                        <li>⬅️➡️ <strong>Flechas / A-D</strong>: Mover nave</li>
                        <li>🔥 <strong>ESPACIO / Click</strong>: Disparar</li>
                    </ul>
                    <p>¡Los enemigos bajan cada vez más rápido! Sobrevive todas las oleadas.</p>
                </div>
            `,
            mar: `
                <h3>🚢 BATALLA NAVAL - Instrucciones</h3>
                <div class="instrucciones-content">
                    <p><strong>Objetivo:</strong> Hundir todos los barcos enemigos.</p>
                    <h4>Controles:</h4>
                    <ul>
                        <li>🖱️ <strong>Click</strong>: Disparar a una casilla</li>
                        <li>💦 Agua = Fallaste</li>
                        <li>💥 Fuego = ¡Impacto!</li>
                        <li>❌ Hundido = ¡Barco destruido!</li>
                    </ul>
                    <p>¡Encuentra y hunde la flota enemiga antes de que hundan la tuya!</p>
                </div>
            `
        };
        
        this.mostrarModal(instrucciones[dominio] || 'Instrucciones no disponibles');
    }

    // Mantener compatibilidad con la función anterior
    this.mostrarPanelShooterTierra = function() {
        this.mostrarPanelShooterDominio('tierra');
    }
    
    this.getEmojiRareza = function(rareza) {
        const emojis = {
            'Común': '⚪',
            'Raro': '🔵',
            'Épico': '🟣',
            'Mítico': '🔴',
            'Legendario': '🟡'
        };
        return emojis[rareza] || '⚪';
    }
    
    this.seleccionarTropaShooter = function(tropaId, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const tropa = tropas.find(t => t.id === tropaId);
        
        if (!tropa || (!tropa.desbloqueado && !this.datosJugador.tropasDesbloqueadas?.[tropaId])) {
            this.mostrarMensaje('🔒 Debes desbloquear primero');
            return;
        }
        
        // Actualizar UI
        $('.tropa-card').removeClass('seleccionada');
        $(`.tropa-card[data-tropa="${tropaId}"]`).addClass('seleccionada');
        
        this.shooterSeleccion.tropa = tropaId;
        
        // Mostrar arsenal del personaje
        $('#infoTropaSeleccionada').show();
        let arsenalHTML = `
            <div class="arsenal-info">
                <div class="arsenal-personaje">
                    <span class="arsenal-emoji">${tropa.emoji}</span>
                    <span class="arsenal-nombre">${tropa.nombre}</span>
                    <span class="arsenal-stats">❤️${tropa.stats.vida} | ⚡${tropa.stats.velocidad}${tropa.stats.flotacion ? ' | 🌊' : ''}${tropa.stats.vuelo ? ' | 🛩️' : ''}</span>
                </div>
                <div class="arsenal-armas">
                    ${tropa.armas.map((arma, i) => `
                        <div class="arma-card">
                            <div class="arma-header">
                                <span class="arma-emoji">${arma.emoji}</span>
                                <span class="arma-nombre">${arma.nombre}</span>
                                <span class="arma-tecla">[${i + 1}]</span>
                            </div>
                            <div class="arma-stats">
                                <span>💥${arma.daño}${arma.perdigones ? `x${arma.perdigones}` : ''}</span>
                                ${arma.alcance ? `<span>📏${arma.alcance}px</span>` : ''}
                                ${arma.cadencia ? `<span>⏱️${arma.cadencia}ms</span>` : ''}
                            </div>
                            <div class="arma-definitiva">
                                <strong>🔥 ${arma.definitiva.nombre}</strong>
                                <p>${arma.definitiva.descripcion}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        $('#arsenalContent').html(arsenalHTML);
        
        this.actualizarEstadoIniciar();
    }
    
    this.seleccionarMapaShooter = function(mapaId, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const mapas = this.mapasShooter[dominio] || [];
        const mapa = mapas.find(m => m.id === mapaId);
        if (!mapa) return;
        
        const desbloqueado = mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapaId);
        
        if (!desbloqueado) {
            // Mostrar opción de compra
            this.mostrarComprarMapa(mapa, dominio);
            return;
        }
        
        // Actualizar UI
        $('.mapa-card').removeClass('seleccionado');
        $(`.mapa-card[data-mapa="${mapaId}"]`).addClass('seleccionado');
        
        this.shooterSeleccion.mapa = mapaId;
        this.actualizarEstadoIniciar();
    }
    
    this.mostrarComprarMapa = function(mapa, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const html = `
            <div style="text-align: center; padding: 20px;">
                <h2>${mapa.emoji} ${mapa.nombre}</h2>
                <div class="rareza-badge rareza-${mapa.rareza.toLowerCase()}">${mapa.rareza}</div>
                <p style="color: #aaa; margin: 15px 0;">${mapa.descripcion}</p>
                <div style="font-size: 1.5rem; margin: 20px 0;">
                    ${mapa.precio > 0 ? `<span>💰 ${mapa.precio.toLocaleString()}</span>` : ''}
                    ${mapa.precioDiamantes ? `<span style="margin-left: 15px;">💎 ${mapa.precioDiamantes}</span>` : ''}
                </div>
                <button class="btn btn-success btn-lg" onclick="cw.comprarMapa('${mapa.id}', '${dominio}')">
                    🔓 DESBLOQUEAR MAPA
                </button>
                <button class="btn btn-secondary mt-2" onclick="$('#miModal').modal('hide');">Cancelar</button>
            </div>
        `;
        this.mostrarModal(html);
    }
    
    this.comprarMapa = function(mapaId, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const mapas = this.mapasShooter[dominio] || [];
        const mapa = mapas.find(m => m.id === mapaId);
        if (!mapa) return;
        
        const puedeComprar = this.datosJugador.monedas >= mapa.precio && 
                            (!mapa.precioDiamantes || this.datosJugador.diamantes >= mapa.precioDiamantes);
        
        if (!puedeComprar) {
            this.mostrarMensaje('❌ No tienes suficientes recursos');
            return;
        }
        
        this.datosJugador.monedas -= mapa.precio;
        if (mapa.precioDiamantes) {
            this.datosJugador.diamantes -= mapa.precioDiamantes;
        }
        
        if (!this.datosJugador.mapasDesbloqueados) {
            this.datosJugador.mapasDesbloqueados = [];
        }
        this.datosJugador.mapasDesbloqueados.push(mapaId);
        
        this.actualizarMonedas();
        this.guardarProgreso();
        
        $('#miModal').modal('hide');
        this.mostrarMensaje(`🗺️ ¡${mapa.nombre} desbloqueado!`);
        this.mostrarPanelShooterDominio(dominio);
    }
    
    this.desbloquearTropaShooter = function(tropaId, dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const tropa = tropas.find(t => t.id === tropaId);
        if (!tropa) return;
        
        const puedeComprar = this.datosJugador.monedas >= tropa.precio && 
                            (!tropa.precioDiamantes || this.datosJugador.diamantes >= tropa.precioDiamantes);
        
        if (!puedeComprar) {
            this.mostrarMensaje('❌ No tienes suficientes recursos');
            return;
        }
        
        this.datosJugador.monedas -= tropa.precio;
        if (tropa.precioDiamantes) {
            this.datosJugador.diamantes -= tropa.precioDiamantes;
        }
        
        if (!this.datosJugador.tropasDesbloqueadas) {
            this.datosJugador.tropasDesbloqueadas = {};
        }
        this.datosJugador.tropasDesbloqueadas[tropaId] = true;
        
        // Marcar como desbloqueado en el objeto original también
        tropa.desbloqueado = true;
        
        this.actualizarMonedas();
        this.guardarProgreso();
        
        this.mostrarMensaje(`🎖️ ¡${tropa.nombre} desbloqueado!`);
        this.mostrarPanelShooterDominio(dominio);
    }
    
    this.actualizarEstadoIniciar = function() {
        const tieneAmbos = this.shooterSeleccion.tropa && this.shooterSeleccion.mapa;
        $('#btnIniciarShooter').prop('disabled', !tieneAmbos);
        
        const dominio = this.shooterSeleccion.dominio || this.dominioActual || 'tierra';
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const mapas = this.mapasShooter[dominio] || [];
        
        if (tieneAmbos) {
            const tropa = tropas.find(t => t.id === this.shooterSeleccion.tropa);
            const mapa = mapas.find(m => m.id === this.shooterSeleccion.mapa);
            $('#seleccionStatus').html(`
                <span style="color: #4CAF50;">✅ ${tropa.emoji} ${tropa.nombre} vs IA en ${mapa.emoji} ${mapa.nombre}</span>
            `);
        } else {
            const nombre = dominio === 'tierra' ? 'soldado' : dominio === 'mar' ? 'nave' : 'aeronave';
            let msg = [];
            if (!this.shooterSeleccion.tropa) msg.push(nombre);
            if (!this.shooterSeleccion.mapa) msg.push('mapa');
            $('#seleccionStatus').html(`Selecciona: ${msg.join(' y ')}`);
        }
    }

    this.iniciarPartidaVsIA = function(dominio, dificultad) {
        this.mostrarMensaje(`🎮 Iniciando partida contra IA...`);
        this.iniciarJuego2D(dominio, 'ia', dificultad);
    }

    // ==========================================
    // TANK STARS - TIERRA (Turnos, ángulo, potencia)
    // ==========================================
    
    // ==========================================
    // 🎮 TANK STARS - SISTEMA COMPLETO
    // Inspirado en Tank Stars con mejoras propias
    // ==========================================
    
    this.iniciarTankStars = function(tropaId, mapaId, dificultad) {
        const tropa = this.unidadesAtaque.tierra.tropas.find(t => t.id === tropaId);
        const mapa = this.mapasShooter.tierra.find(m => m.id === mapaId);
        
        if (!tropa || !mapa) {
            this.mostrarMensaje('❌ Error al iniciar');
            return;
        }
        
        // Configurar dificultad del bot
        dificultad = dificultad || 'normal';
        const dificultadMap = { 'facil': 'facil', 'normal': 'normal', 'dificil': 'dificil', 'experto': 'imposible' };
        this.BotTankStars.dificultadActual = dificultadMap[dificultad] || 'normal';
        
        // Ocultar UI principal
        $('.game-container').hide();
        $('#googleSigninContainer').hide();
        $('#rankingPanel').hide();
        $('#profileIcon').hide();
        
        const W = mapa.config?.ancho || 1400;
        const H = mapa.config?.alto || 700;
        
        // Estado del juego Tank Stars
        this.tankGame = {
            activo: true,
            turno: 'jugador',
            fase: 'mover', // 'mover', 'apuntar', 'disparo', 'espera'
            turnoNumero: 1,
            mapa: mapa,
            viento: (Math.random() - 0.5) * 2 * (mapa.config?.vientoBase || 0.3),
            gravedad: mapa.config?.gravedad || 0.35,
            
            // Dimensiones
            W: W,
            H: H,
            
            // 🎮 JUGADOR
            jugador: {
                tropa: tropa,
                x: 120,
                y: 0,
                vida: tropa.stats.vida,
                vidaMax: tropa.stats.vida,
                armadura: tropa.stats.armadura || 0,
                combustible: tropa.stats.combustible || 100,
                combustibleMax: tropa.stats.combustible || 100,
                angulo: 45,
                potencia: 50,
                armaActual: 0,
                municion: this.copiarMunicion(tropa.armas),
                efectos: [], // Congelado, quemando, etc.
                superpoderListo: false,
                superpoderUsado: false
            },
            
            // 🤖 ENEMIGO
            enemigo: {
                tropa: this.getEnemigoAleatorio('tierra') || tropa,
                x: W - 120,
                y: 0,
                vida: 0,
                vidaMax: 0,
                armadura: 0,
                angulo: 135,
                potencia: 50,
                armaActual: 0,
                municion: [],
                efectos: []
            },
            
            // Terreno y física
            terreno: [],
            plataformas: [],
            zonasEspeciales: [], // Lava, agua, hielo, etc.
            obstaculos: [],
            proyectil: null,
            proyectilesExtra: [], // Para salvas múltiples
            explosiones: [],
            particulas: [],
            
            // Efectos del mapa
            efectosMapa: mapa.config?.efectos || {},
            
            canvas: null,
            ctx: null,
            animationFrame: null
        };
        
        // Configurar enemigo
        const enemigoTropa = this.tankGame.enemigo.tropa;
        this.tankGame.enemigo.vida = enemigoTropa.stats?.vida || 100;
        this.tankGame.enemigo.vidaMax = enemigoTropa.stats?.vida || 100;
        this.tankGame.enemigo.armadura = enemigoTropa.stats?.armadura || 0;
        this.tankGame.enemigo.municion = this.copiarMunicion(enemigoTropa.armas || []);
        
        // Generar terreno según tipo de mapa
        this.generarTerrenoTankStars();
        
        // Crear interfaz
        this.crearInterfazTankStars();
        
        // Iniciar controles
        this.iniciarControlesTankStars();
        
        // Iniciar loop de renderizado
        this.renderLoopTankStars();
        
        // Mostrar mensaje de inicio
        this.mostrarMensajeTank('⚔️ ¡BATALLA!', `${tropa.nombre} vs ${enemigoTropa.nombre}`, 2000);
    }
    
    // Copiar munición de las armas
    this.copiarMunicion = function(armas) {
        return armas.map(arma => ({
            id: arma.id,
            municion: arma.municion || -1 // -1 = infinita
        }));
    }
    
    // Obtener enemigo aleatorio
    this.getEnemigoAleatorio = function(dominio) {
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        if (tropas.length === 0) return null;
        return tropas[Math.floor(Math.random() * tropas.length)];
    }
    
    // 🏔️ GENERACIÓN DE TERRENO AVANZADA
    this.generarTerrenoTankStars = function() {
        const game = this.tankGame;
        const mapa = game.mapa;
        const W = game.W;
        const H = game.H;
        const config = mapa.config || {};
        const tipoTerreno = config.tipoTerreno || 'colinas';
        
        game.terreno = [];
        game.plataformas = [];
        game.zonasEspeciales = [];
        
        const numPuntos = Math.floor(W / 8);
        
        // Generar terreno base según tipo
        switch(tipoTerreno) {
            case 'plano':
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    const y = H - 100 + Math.sin(i * 0.1) * 10;
                    game.terreno.push({ x, y });
                }
                break;
                
            case 'colinas':
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    const colina1 = Math.sin(x * 0.008) * 60;
                    const colina2 = Math.sin(x * 0.02) * 30;
                    const colina3 = Math.cos(x * 0.004) * 40;
                    let y = H - 100 - colina1 - colina2 - colina3;
                    y = Math.max(H - 250, Math.min(H - 60, y));
                    game.terreno.push({ x, y });
                }
                break;
                
            case 'montanas':
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    let y;
                    
                    // Crear picos y valles pronunciados
                    const pico = Math.abs(Math.sin(x * 0.005)) * 180;
                    const ruido = Math.sin(x * 0.03) * 20;
                    y = H - 80 - pico - ruido;
                    
                    // Añadir huecos mortales si está configurado
                    if (config.efectos?.huecosMortales) {
                        const posiciones = config.efectos.posicionesHuecos || [];
                        const anchoHueco = config.efectos.anchoHueco || 50;
                        for (const pos of posiciones) {
                            const huecoX = pos * W;
                            if (Math.abs(x - huecoX) < anchoHueco) {
                                y = H + 50; // Debajo del mapa = vacío
                            }
                        }
                    }
                    
                    y = Math.max(H - 350, Math.min(H + 50, y));
                    game.terreno.push({ x, y });
                }
                break;
                
            case 'dunas':
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    const duna1 = Math.sin(x * 0.01) * 50;
                    const duna2 = Math.sin(x * 0.025 + 1) * 35;
                    let y = H - 100 - duna1 - duna2;
                    y = Math.max(H - 200, Math.min(H - 50, y));
                    game.terreno.push({ x, y });
                }
                break;
                
            case 'canyon':
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    const distCentro = Math.abs(x - W/2) / (W/2);
                    const profundidad = (1 - distCentro) * 100;
                    let y = H - 80 - profundidad + Math.sin(x * 0.02) * 20;
                    y = Math.max(H - 300, Math.min(H - 50, y));
                    game.terreno.push({ x, y });
                }
                break;
                
            case 'islas':
            case 'infierno':
                // Crear plataformas flotantes
                const numPlat = config.efectos?.numPlataformas || config.efectos?.plataformasSeguras || 4;
                const anchoPlat = config.efectos?.anchoPlataforma || 150;
                
                for (let i = 0; i < numPlat; i++) {
                    const platX = (W / (numPlat + 1)) * (i + 1) - anchoPlat/2;
                    const platY = H - 150 - Math.sin(i * 1.5) * 80;
                    game.plataformas.push({
                        x: platX,
                        y: platY,
                        ancho: anchoPlat,
                        alto: 25
                    });
                }
                
                // Terreno base = vacío/lava
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    game.terreno.push({ x, y: H + 100 }); // Todo vacío
                }
                break;
                
            case 'volcanico':
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    let y;
                    
                    // Centro = cráter con lava
                    const distCentro = Math.abs(x - W/2);
                    if (distCentro < (config.efectos?.anchoLava || 100) / 2) {
                        y = H + 50; // Lava
                    } else {
                        const borde = Math.sin((x - W/2) * 0.01) * 60;
                        y = H - 100 - Math.abs(borde);
                    }
                    
                    y = Math.max(H - 250, Math.min(H + 50, y));
                    game.terreno.push({ x, y });
                }
                
                // Zona de lava
                game.zonasEspeciales.push({
                    tipo: 'lava',
                    x: W/2 - 60,
                    ancho: 120,
                    daño: config.efectos?.dañoLava || 50
                });
                break;
                
            case 'hielo':
            case 'pantano':
            case 'lunar':
            case 'nuclear':
            case 'trincheras':
            case 'urbano':
            default:
                // Terreno con colinas estándar
                for (let i = 0; i <= numPuntos; i++) {
                    const x = (i / numPuntos) * W;
                    const colina = Math.sin(x * 0.01) * 50 + Math.sin(x * 0.025) * 25;
                    let y = H - 100 - colina;
                    y = Math.max(H - 200, Math.min(H - 50, y));
                    game.terreno.push({ x, y });
                }
        }
        
        // Posicionar jugador y enemigo sobre el terreno
        game.jugador.y = this.getAlturaTerreno(game.jugador.x) - 30;
        game.enemigo.y = this.getAlturaTerreno(game.enemigo.x) - 30;
        
        // Verificar que estén sobre plataformas si es mapa de islas
        if (game.plataformas.length > 0) {
            game.jugador.x = game.plataformas[0].x + game.plataformas[0].ancho / 2;
            game.jugador.y = game.plataformas[0].y - 30;
            
            const ultimaPlat = game.plataformas[game.plataformas.length - 1];
            game.enemigo.x = ultimaPlat.x + ultimaPlat.ancho / 2;
            game.enemigo.y = ultimaPlat.y - 30;
        }
        
        // Generar obstáculos
        game.obstaculos = [];
        if (config.obstaculos) {
            for (const obs of config.obstaculos) {
                const obsY = this.getAlturaTerreno(obs.x);
                game.obstaculos.push({
                    x: obs.x,
                    y: obsY - (obs.altura || 60),
                    ancho: 50 + Math.random() * 30,
                    alto: obs.altura || 60,
                    vida: obs.vida || 50,
                    tipo: obs.tipo || 'roca'
                });
            }
        }
    }
    
    this.getAlturaTerreno = function(x) {
        const game = this.tankGame;
        if (!game) return 500;
        
        // Primero verificar plataformas
        for (const plat of game.plataformas) {
            if (x >= plat.x && x <= plat.x + plat.ancho) {
                return plat.y;
            }
        }
        
        // Luego verificar terreno
        const terreno = game.terreno;
        if (!terreno.length) return 500;
        
        for (let i = 0; i < terreno.length - 1; i++) {
            if (x >= terreno[i].x && x <= terreno[i + 1].x) {
                const t = (x - terreno[i].x) / (terreno[i + 1].x - terreno[i].x);
                return terreno[i].y + t * (terreno[i + 1].y - terreno[i].y);
            }
        }
        return terreno[terreno.length - 1].y;
    }
    
    this.crearInterfazTankStars = function() {
        const game = this.tankGame;
        const jugador = game.jugador;
        const enemigo = game.enemigo;
        const mapa = game.mapa;
        
        const html = `
            <div class="tankstars-container" id="tankStarsGame">
                <!-- HUD Superior -->
                <div class="tank-hud">
                    <div class="tank-player-info player">
                        <div class="tank-avatar">
                            <span class="tank-emoji">${jugador.tropa.emoji}</span>
                            <span class="tank-rareza ${jugador.tropa.rareza.toLowerCase()}">${jugador.tropa.rareza}</span>
                        </div>
                        <div class="tank-stats">
                            <div class="tank-name">${jugador.tropa.nombre}</div>
                            <div class="tank-health-bar">
                                <div class="tank-health-fill jugador" id="jugadorVida" style="width: 100%"></div>
                                <span class="tank-health-text" id="jugadorVidaTexto">${jugador.vida}/${jugador.vidaMax}</span>
                            </div>
                            <div class="tank-fuel-bar">
                                <div class="tank-fuel-fill" id="jugadorFuel" style="width: 100%"></div>
                                <span class="tank-fuel-text">⛽ <span id="jugadorFuelTexto">${jugador.combustible}</span></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tank-center-info">
                        <div class="tank-turno-container">
                            <div class="tank-turno" id="turnoIndicador">🎮 TU TURNO</div>
                            <div class="tank-fase" id="faseIndicador">Fase: Mover</div>
                        </div>
                        <div class="tank-turno-num">Turno #<span id="turnoNumero">${game.turnoNumero}</span></div>
                        <div class="tank-viento" id="vientoContainer">
                            💨 Viento: <span id="vientoValor">${game.viento > 0 ? '→' : '←'} ${Math.abs(game.viento * 10).toFixed(1)}</span>
                        </div>
                        <div class="tank-mapa-info">
                            ${mapa.emoji} ${mapa.nombre}
                        </div>
                    </div>
                    
                    <div class="tank-player-info enemy">
                        <div class="tank-stats">
                            <div class="tank-name">${enemigo.tropa.nombre}</div>
                            <div class="tank-health-bar">
                                <div class="tank-health-fill enemigo" id="enemigoVida" style="width: 100%"></div>
                                <span class="tank-health-text" id="enemigoVidaTexto">${enemigo.vida}/${enemigo.vidaMax}</span>
                            </div>
                        </div>
                        <div class="tank-avatar">
                            <span class="tank-emoji">${enemigo.tropa.emoji}</span>
                            <span class="tank-rareza ${enemigo.tropa.rareza?.toLowerCase() || 'común'}">${enemigo.tropa.rareza || 'Común'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Canvas del juego -->
                <div class="tank-canvas-container">
                    <canvas id="tankCanvas" width="${game.W}" height="${game.H}"></canvas>
                    <div class="tank-mensaje" id="tankMensaje" style="display: none;"></div>
                </div>
                
                <!-- Controles inferiores -->
                <div class="tank-controls">
                    <div class="tank-controls-left">
                        <div class="tank-control-group movimiento">
                            <label>🚗 Movimiento</label>
                            <div class="tank-move-buttons">
                                <button class="tank-move-btn" id="btnMoverIzq" onclick="cw.moverTanque(-1)">◀ Izq</button>
                                <span class="fuel-indicator">⛽ <span id="fuelRestante">${jugador.combustible}</span></span>
                                <button class="tank-move-btn" id="btnMoverDer" onclick="cw.moverTanque(1)">Der ▶</button>
                            </div>
                            <button class="tank-end-move-btn" id="btnFinMover" onclick="cw.finalizarMovimiento()">
                                ✓ Fin Movimiento
                            </button>
                        </div>
                    </div>
                    
                    <div class="tank-controls-center">
                        <div class="tank-control-group">
                            <label>🎯 Ángulo: <span id="anguloValor">${jugador.angulo}°</span></label>
                            <div class="control-slider">
                                <button class="control-btn" onclick="cw.ajustarAnguloTank(-5)">-5</button>
                                <input type="range" id="anguloSlider" min="0" max="180" value="${jugador.angulo}" 
                                       oninput="cw.setAnguloTank(this.value)">
                                <button class="control-btn" onclick="cw.ajustarAnguloTank(5)">+5</button>
                            </div>
                        </div>
                        
                        <div class="tank-control-group">
                            <label>💪 Potencia: <span id="potenciaValor">${jugador.potencia}%</span></label>
                            <div class="control-slider">
                                <button class="control-btn" onclick="cw.ajustarPotenciaTank(-5)">-5</button>
                                <input type="range" id="potenciaSlider" min="10" max="100" value="${jugador.potencia}"
                                       oninput="cw.setPotenciaTank(this.value)">
                                <button class="control-btn" onclick="cw.ajustarPotenciaTank(5)">+5</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tank-controls-right">
                        <div class="tank-control-group armas">
                            <label>🔫 Armas</label>
                            <div class="tank-armas" id="armasContainer">
                                ${jugador.tropa.armas.map((arma, i) => {
                                    const muni = jugador.municion[i];
                                    const muniText = muni.municion === -1 ? '∞' : muni.municion;
                                    return `
                                        <button class="tank-arma-btn ${i === 0 ? 'active' : ''}" data-arma="${i}" 
                                                onclick="cw.cambiarArmaTank(${i})" ${muni.municion === 0 ? 'disabled' : ''}>
                                            ${arma.emoji} <span class="arma-muni">${muniText}</span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        
                        <button class="tank-fire-btn" id="btnDisparar" onclick="cw.dispararTankStars()" disabled>
                            🔥 DISPARAR
                        </button>
                        
                        <button class="tank-super-btn" id="btnSuperpoder" onclick="cw.usarSuperpoderTank()" 
                                disabled title="${jugador.tropa.superpoder?.descripcion || ''}">
                            ${jugador.tropa.superpoder?.emoji || '⭐'} SUPER
                        </button>
                    </div>
                    
                    <button class="tank-exit-btn" onclick="cw.salirTankStars()">✕</button>
                </div>
            </div>
        `;
        
        $('body').append(html);
        
        // Configurar canvas
        const canvas = document.getElementById('tankCanvas');
        game.canvas = canvas;
        game.ctx = canvas.getContext('2d');
        
        // Actualizar UI inicial
        this.actualizarUIFase();
    }
    
    this.actualizarUIFase = function() {
        const game = this.tankGame;
        if (!game) return;
        
        const esMiTurno = game.turno === 'jugador';
        
        // Actualizar indicadores
        $('#turnoIndicador').text(esMiTurno ? '🎮 TU TURNO' : '🤖 TURNO ENEMIGO')
            .removeClass('player enemy').addClass(esMiTurno ? 'player' : 'enemy');
        
        // Fase de movimiento
        if (game.fase === 'mover') {
            $('#faseIndicador').text('Fase: Mover 🚗');
            $('#btnMoverIzq, #btnMoverDer, #btnFinMover').prop('disabled', !esMiTurno);
            $('#btnDisparar').prop('disabled', true);
            $('.tank-controls-center').addClass('disabled');
        }
        // Fase de apuntar
        else if (game.fase === 'apuntar') {
            $('#faseIndicador').text('Fase: Apuntar 🎯');
            $('#btnMoverIzq, #btnMoverDer, #btnFinMover').prop('disabled', true);
            $('#btnDisparar').prop('disabled', !esMiTurno);
            $('.tank-controls-center').removeClass('disabled');
        }
        // Fase de disparo o espera
        else {
            $('#faseIndicador').text('Fase: ' + (game.fase === 'disparo' ? 'Disparo 💥' : 'Espera ⏳'));
            $('#btnMoverIzq, #btnMoverDer, #btnFinMover, #btnDisparar').prop('disabled', true);
        }
    }
    
    // 🚗 SISTEMA DE MOVIMIENTO
    this.moverTanque = function(direccion) {
        const game = this.tankGame;
        if (!game || game.turno !== 'jugador' || game.fase !== 'mover') return;
        
        const jugador = game.jugador;
        const costoPorMovimiento = 5;
        
        if (jugador.combustible < costoPorMovimiento) {
            this.mostrarMensaje('⛽ Sin combustible');
            return;
        }
        
        // Calcular nueva posición
        const velocidad = jugador.tropa.stats.velocidad || 4;
        let nuevaX = jugador.x + (direccion * velocidad * 5);
        
        // Limitar a los bordes del mapa
        nuevaX = Math.max(50, Math.min(game.W - 50, nuevaX));
        
        // Verificar si cae al vacío
        const nuevaY = this.getAlturaTerreno(nuevaX);
        if (nuevaY > game.H) {
            this.mostrarMensaje('⚠️ ¡Cuidado con el vacío!');
            return;
        }
        
        // Mover
        jugador.x = nuevaX;
        jugador.y = nuevaY - 30;
        jugador.combustible -= costoPorMovimiento;
        
        // Actualizar UI
        $('#jugadorFuel').css('width', (jugador.combustible / jugador.combustibleMax * 100) + '%');
        $('#jugadorFuelTexto, #fuelRestante').text(jugador.combustible);
        
        // 🌐 MULTIJUGADOR: Enviar movimiento al rival en tiempo real
        if (game.esMulti && ws) {
            ws.enviarMovimientoTank(jugador.x, jugador.y, jugador.combustible);
        }
    }
    
    this.finalizarMovimiento = function() {
        const game = this.tankGame;
        if (!game || game.turno !== 'jugador' || game.fase !== 'mover') return;
        
        game.fase = 'apuntar';
        this.actualizarUIFase();
    }
    
    // 🌟 SISTEMA DE SUPERPODERES
    this.usarSuperpoderTank = function() {
        const game = this.tankGame;
        if (!game || game.turno !== 'jugador') return;
        
        const jugador = game.jugador;
        if (jugador.superpoderUsado) {
            this.mostrarMensaje('⚠️ Ya usaste tu superpoder');
            return;
        }
        
        const superpoder = jugador.tropa.superpoder;
        if (!superpoder) return;
        
        jugador.superpoderUsado = true;
        $('#btnSuperpoder').prop('disabled', true).addClass('used');
        
        this.mostrarMensajeTank(`${superpoder.emoji} ${superpoder.nombre}`, superpoder.descripcion, 2000);
        
        game.fase = 'disparo';
        $('#btnDisparar').prop('disabled', true);
        
        // Ejecutar superpoder según tipo
        switch(superpoder.nombre) {
            case 'Airstrike':
                this.superpoderAirstrike(superpoder);
                break;
            case 'Blitzkrieg':
                this.superpoderBlitzkrieg(superpoder);
                break;
            case 'Lluvia de Fuego':
                this.superpoderLluviaDeFuego(superpoder);
                break;
            case 'Tormenta de Hielo':
                this.superpoderTormentaHielo(superpoder);
                break;
            case 'Apocalipsis Nuclear':
                this.superpoderApocalipsisNuclear(superpoder);
                break;
            default:
                // Superpoder genérico - daño directo
                this.superpoderGenerico(superpoder);
        }
    }
    
    this.superpoderAirstrike = function(superpoder) {
        const game = this.tankGame;
        const enemigo = game.enemigo;
        
        // Crear múltiples bombas que caen
        let bombasRestantes = superpoder.bombas || 3;
        const intervalo = setInterval(() => {
            if (bombasRestantes <= 0 || !game.activo) {
                clearInterval(intervalo);
                setTimeout(() => this.finTurnoTank(), 500);
                return;
            }
            
            // Posición aleatoria cerca del enemigo
            const targetX = enemigo.x + (Math.random() - 0.5) * 150;
            const targetY = this.getAlturaTerreno(targetX);
            
            // Crear explosión
            game.explosiones.push({
                x: targetX,
                y: targetY,
                radio: superpoder.radio || 80,
                progreso: 0,
                grande: true
            });
            
            // Calcular daño
            const dist = Math.abs(targetX - enemigo.x);
            if (dist < superpoder.radio) {
                const daño = Math.round(superpoder.daño * (1 - dist / superpoder.radio));
                enemigo.vida = Math.max(0, enemigo.vida - daño);
                this.actualizarHUDTank();
                
                if (enemigo.vida <= 0) {
                    clearInterval(intervalo);
                    this.finalizarTankStars('victoria');
                    return;
                }
            }
            
            bombasRestantes--;
        }, 400);
    }
    
    this.superpoderBlitzkrieg = function(superpoder) {
        const game = this.tankGame;
        const jugador = game.jugador;
        
        // Disparo triple rápido
        let disparosRestantes = 3;
        const intervalo = setInterval(() => {
            if (disparosRestantes <= 0 || !game.activo) {
                clearInterval(intervalo);
                setTimeout(() => this.finTurnoTank(), 500);
                return;
            }
            
            const anguloBase = jugador.angulo + (disparosRestantes - 2) * 15;
            const anguloRad = (180 - anguloBase) * Math.PI / 180;
            const velocidad = jugador.potencia * 0.12;
            
            // Simular disparo
            let x = jugador.x;
            let y = jugador.y - 30;
            let vx = Math.cos(anguloRad) * velocidad;
            let vy = Math.sin(anguloRad) * velocidad;
            
            // Calcular impacto
            for (let i = 0; i < 100; i++) {
                vy += game.gravedad;
                vx += game.viento * 0.02;
                x += vx;
                y += vy;
                
                const alturaTerreno = this.getAlturaTerreno(x);
                if (y >= alturaTerreno) {
                    // Impacto en terreno
                    game.explosiones.push({ x, y: alturaTerreno, radio: 50, progreso: 0 });
                    
                    const dist = Math.sqrt((x - game.enemigo.x)**2 + (alturaTerreno - game.enemigo.y)**2);
                    if (dist < 70) {
                        const daño = Math.round(superpoder.dañoPorDisparo * (1 - dist/70 * 0.5));
                        game.enemigo.vida = Math.max(0, game.enemigo.vida - daño);
                        this.actualizarHUDTank();
                    }
                    break;
                }
            }
            
            if (game.enemigo.vida <= 0) {
                clearInterval(intervalo);
                this.finalizarTankStars('victoria');
                return;
            }
            
            disparosRestantes--;
        }, 300);
    }
    
    this.superpoderLluviaDeFuego = function(superpoder) {
        const game = this.tankGame;
        const enemigo = game.enemigo;
        
        // Lluvia de cohetes
        let cohetesRestantes = superpoder.cohetes || 8;
        const zonaInicio = enemigo.x - 150;
        const zonaFin = enemigo.x + 150;
        
        const intervalo = setInterval(() => {
            if (cohetesRestantes <= 0 || !game.activo) {
                clearInterval(intervalo);
                setTimeout(() => this.finTurnoTank(), 500);
                return;
            }
            
            const targetX = zonaInicio + Math.random() * (zonaFin - zonaInicio);
            const targetY = this.getAlturaTerreno(targetX);
            
            game.explosiones.push({
                x: targetX,
                y: targetY,
                radio: 40,
                progreso: 0
            });
            
            const dist = Math.sqrt((targetX - enemigo.x)**2 + (targetY - enemigo.y)**2);
            if (dist < 60) {
                const daño = Math.round(superpoder.dañoPorCohete * (1 - dist/60 * 0.5));
                enemigo.vida = Math.max(0, enemigo.vida - daño);
                this.actualizarHUDTank();
            }
            
            if (enemigo.vida <= 0) {
                clearInterval(intervalo);
                this.finalizarTankStars('victoria');
                return;
            }
            
            cohetesRestantes--;
        }, 150);
    }
    
    this.superpoderTormentaHielo = function(superpoder) {
        const game = this.tankGame;
        const enemigo = game.enemigo;
        
        // Efecto de congelación + daño
        game.explosiones.push({
            x: enemigo.x,
            y: enemigo.y - 20,
            radio: superpoder.radio || 120,
            progreso: 0,
            tipo: 'hielo'
        });
        
        // Daño inicial
        enemigo.vida = Math.max(0, enemigo.vida - superpoder.daño);
        this.actualizarHUDTank();
        
        // Añadir efecto de congelación (ralentiza IA)
        enemigo.efectos.push({
            tipo: 'congelado',
            turnos: superpoder.turnosCongelado || 2
        });
        
        this.mostrarMensajeTank('❄️ ¡CONGELADO!', `El enemigo está ralentizado por ${superpoder.turnosCongelado} turnos`, 1500);
        
        if (enemigo.vida <= 0) {
            this.finalizarTankStars('victoria');
        } else {
            setTimeout(() => this.finTurnoTank(), 1000);
        }
    }
    
    this.superpoderApocalipsisNuclear = function(superpoder) {
        const game = this.tankGame;
        const enemigo = game.enemigo;
        
        // Efecto épico de bomba nuclear
        this.mostrarMensajeTank('☢️ APOCALIPSIS', '¡BOMBA NUCLEAR LANZADA!', 2000);
        
        setTimeout(() => {
            // Gran explosión en el centro del mapa
            const centroX = game.W / 2;
            const centroY = game.H / 2;
            
            // Múltiples anillos de explosión
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    game.explosiones.push({
                        x: centroX + (Math.random() - 0.5) * 200,
                        y: this.getAlturaTerreno(centroX) - i * 30,
                        radio: 100 + i * 30,
                        progreso: 0,
                        grande: true
                    });
                }, i * 100);
            }
            
            // Daño masivo al enemigo
            setTimeout(() => {
                enemigo.vida = Math.max(0, enemigo.vida - superpoder.daño);
                this.actualizarHUDTank();
                
                // También daño al jugador (radiación)
                const radiacionJugador = Math.round(superpoder.radiacion || 15);
                game.jugador.vida = Math.max(1, game.jugador.vida - radiacionJugador);
                this.actualizarHUDTank();
                
                this.mostrarMensaje(`☢️ Radiación: -${radiacionJugador} vida`);
                
                if (enemigo.vida <= 0) {
                    this.finalizarTankStars('victoria');
                } else {
                    setTimeout(() => this.finTurnoTank(), 1000);
                }
            }, 600);
        }, 1000);
    }
    
    this.superpoderGenerico = function(superpoder) {
        const game = this.tankGame;
        const enemigo = game.enemigo;
        
        game.explosiones.push({
            x: enemigo.x,
            y: enemigo.y - 20,
            radio: superpoder.radio || 80,
            progreso: 0,
            grande: true
        });
        
        enemigo.vida = Math.max(0, enemigo.vida - (superpoder.daño || 50));
        this.actualizarHUDTank();
        
        if (enemigo.vida <= 0) {
            this.finalizarTankStars('victoria');
        } else {
            setTimeout(() => this.finTurnoTank(), 1000);
        }
    }
    
    // Mostrar mensaje pequeño en Tank Stars (no invasivo)
    this.mostrarMensajeTank = function(titulo, subtitulo, duracion) {
        const $msg = $('#tankMensaje');
        // Mensaje pequeño en esquina superior
        $msg.html(`<span class="tank-msg-mini">${titulo} ${subtitulo || ''}</span>`)
            .addClass('mini-mode')
            .fadeIn(150);
        
        setTimeout(() => $msg.fadeOut(200), duracion || 1500);
    }
    
    this.iniciarControlesTankStars = function() {
        $(document).on('keydown.tankstars', (e) => {
            const game = this.tankGame;
            if (!game || !game.activo) return;
            
            // Controles según fase
            if (game.turno === 'jugador') {
                if (game.fase === 'mover') {
                    switch(e.key) {
                        case 'a':
                        case 'A':
                        case 'ArrowLeft':
                            this.moverTanque(-1);
                            break;
                        case 'd':
                        case 'D':
                        case 'ArrowRight':
                            this.moverTanque(1);
                            break;
                        case 'Enter':
                        case ' ':
                            e.preventDefault();
                            this.finalizarMovimiento();
                            break;
                    }
                } else if (game.fase === 'apuntar') {
                    switch(e.key) {
                        case 'ArrowLeft':
                            this.ajustarAnguloTank(-2);
                            break;
                        case 'ArrowRight':
                            this.ajustarAnguloTank(2);
                            break;
                        case 'ArrowUp':
                            this.ajustarPotenciaTank(2);
                            break;
                        case 'ArrowDown':
                            this.ajustarPotenciaTank(-2);
                            break;
                        case ' ':
                        case 'Enter':
                            e.preventDefault();
                            this.dispararTankStars();
                            break;
                        case '1':
                        case '2':
                        case '3':
                            this.cambiarArmaTank(parseInt(e.key) - 1);
                            break;
                        case 's':
                        case 'S':
                            this.usarSuperpoderTank();
                            break;
                    }
                }
            }
            
            if (e.key === 'Escape') {
                this.salirTankStars();
            }
        });
        
        // Soporte táctil para móviles
        const canvas = document.getElementById('tankCanvas');
        if (canvas) {
            let touchStartX = 0;
            let touchStartY = 0;
            
            canvas.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            });
            
            canvas.addEventListener('touchend', (e) => {
                const game = this.tankGame;
                if (!game || game.turno !== 'jugador') return;
                
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;
                
                if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20) {
                    // Tap = disparar o avanzar fase
                    if (game.fase === 'mover') {
                        this.finalizarMovimiento();
                    } else if (game.fase === 'apuntar') {
                        this.dispararTankStars();
                    }
                } else if (game.fase === 'mover') {
                    // Swipe horizontal = mover
                    this.moverTanque(deltaX > 0 ? 1 : -1);
                } else if (game.fase === 'apuntar') {
                    // Swipe = ajustar ángulo/potencia
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        this.ajustarAnguloTank(deltaX > 0 ? 5 : -5);
                    } else {
                        this.ajustarPotenciaTank(deltaY < 0 ? 5 : -5);
                    }
                }
            });
        }
    }
    
    this.ajustarAnguloTank = function(delta) {
        const game = this.tankGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.jugador.angulo = Math.max(0, Math.min(180, game.jugador.angulo + delta));
        $('#anguloSlider').val(game.jugador.angulo);
        $('#anguloValor').text(game.jugador.angulo + '°');
        
        // 🌐 MULTIJUGADOR: Sincronizar apuntado
        if (game.esMulti && ws) {
            ws.enviarApuntadoTank(game.jugador.angulo, game.jugador.potencia);
        }
    }
    
    this.setAnguloTank = function(valor) {
        const game = this.tankGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.jugador.angulo = parseInt(valor);
        $('#anguloValor').text(game.jugador.angulo + '°');
        
        // 🌐 MULTIJUGADOR: Sincronizar apuntado
        if (game.esMulti && ws) {
            ws.enviarApuntadoTank(game.jugador.angulo, game.jugador.potencia);
        }
    }
    
    this.ajustarPotenciaTank = function(delta) {
        const game = this.tankGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.jugador.potencia = Math.max(10, Math.min(100, game.jugador.potencia + delta));
        $('#potenciaSlider').val(game.jugador.potencia);
        $('#potenciaValor').text(game.jugador.potencia + '%');
        
        // 🌐 MULTIJUGADOR: Sincronizar apuntado
        if (game.esMulti && ws) {
            ws.enviarApuntadoTank(game.jugador.angulo, game.jugador.potencia);
        }
    }
    
    this.setPotenciaTank = function(valor) {
        const game = this.tankGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.jugador.potencia = parseInt(valor);
        $('#potenciaValor').text(game.jugador.potencia + '%');
        
        // 🌐 MULTIJUGADOR: Sincronizar apuntado
        if (game.esMulti && ws) {
            ws.enviarApuntadoTank(game.jugador.angulo, game.jugador.potencia);
        }
    }
    
    this.cambiarArmaTank = function(idx) {
        const game = this.tankGame;
        if (!game || idx >= game.jugador.tropa.armas.length) return;
        
        game.jugador.armaActual = idx;
        $('.tank-arma-btn').removeClass('active');
        $(`.tank-arma-btn[data-arma="${idx}"]`).addClass('active');
    }
    
    this.dispararTankStars = function() {
        const game = this.tankGame;
        if (!game || game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.fase = 'disparo';
        $('#btnDisparar').prop('disabled', true);
        
        const jugador = game.jugador;
        const arma = jugador.tropa.armas[jugador.armaActual];
        
        // Usar el mismo ángulo que el cañón y la trayectoria
        const anguloRad = jugador.angulo * Math.PI / 180;
        
        // Velocidad basada en el arma + potencia
        const velocidadBase = arma.proyectilVelocidad || 15;
        const velocidad = (jugador.potencia / 100) * velocidadBase * 0.8;
        
        // Daño basado en el arma
        const danioBase = arma.daño || 15;
        const alcanceMax = arma.alcance || 400;
        
        // Calcular posición de la boca del cañón (igual que en dibujarTanqueMejorado)
        const canonLen = 45;
        const bocaCanonX = jugador.x + Math.cos(anguloRad) * canonLen;
        const bocaCanonY = jugador.y - 38 - Math.sin(anguloRad) * canonLen;
        
        game.proyectil = {
            x: bocaCanonX,
            y: bocaCanonY,
            vx: Math.cos(anguloRad) * velocidad,
            vy: -Math.sin(anguloRad) * velocidad, // Negativo para ir hacia arriba
            radio: arma.tipo === 'cañon' ? 12 : arma.tipo === 'francotirador' ? 5 : 8,
            daño: danioBase,
            alcanceMax: alcanceMax,
            distanciaRecorrida: 0,
            propietario: 'jugador',
            rastro: [],
            tipoArma: arma.tipo,
            // Efectos especiales por tipo de arma
            explosivo: arma.tipo === 'cañon' || arma.tipo === 'cohetes',
            radioExplosion: arma.tipo === 'cañon' ? 60 : arma.tipo === 'cohetes' ? 80 : 0,
            penetrante: arma.tipo === 'francotirador'
        };
        
        // Si es multijugador, enviar disparo al rival
        if (game.esMulti && ws) {
            ws.enviarDisparoTank(jugador.angulo, jugador.potencia, jugador.armaActual);
        }
    }
    
    // ==========================================
    // SISTEMA DE BOT/IA CON DIFICULTADES
    // ==========================================
    
    this.BotTankStars = {
        dificultades: {
            facil: {
                nombre: '🟢 Fácil',
                precision: 0.3,      // Qué tan cerca del ángulo óptimo (0-1)
                potenciaPrecision: 0.4,
                tiempoReaccion: 2000,
                variacionAngulo: 40,  // Grados de error máximo
                variacionPotencia: 30
            },
            normal: {
                nombre: '🟡 Normal',
                precision: 0.6,
                potenciaPrecision: 0.65,
                tiempoReaccion: 1500,
                variacionAngulo: 25,
                variacionPotencia: 20
            },
            dificil: {
                nombre: '🔴 Difícil',
                precision: 0.85,
                potenciaPrecision: 0.85,
                tiempoReaccion: 1000,
                variacionAngulo: 12,
                variacionPotencia: 10
            },
            imposible: {
                nombre: '💀 Imposible',
                precision: 0.98,
                potenciaPrecision: 0.95,
                tiempoReaccion: 500,
                variacionAngulo: 3,
                variacionPotencia: 5
            }
        },
        dificultadActual: 'normal',
        
        calcularDisparoOptimo: function(game) {
            const enemigo = game.enemigo;
            const jugador = game.jugador;
            const dx = jugador.x - enemigo.x;
            const dy = (jugador.y - 20) - (enemigo.y - 30);
            const distancia = Math.sqrt(dx * dx + dy * dy);
            
            // Calcular ángulo óptimo considerando gravedad y viento
            const g = game.gravedad;
            const v = 12; // velocidad base
            
            // Fórmula simplificada para ángulo de tiro parabólico
            let anguloOptimo = Math.atan2(-dy, -dx) * 180 / Math.PI;
            
            // Ajustar por distancia (más distancia = más ángulo)
            anguloOptimo += distancia * 0.02;
            
            // Ajustar por viento
            anguloOptimo -= game.viento * 8;
            
            // Potencia óptima basada en distancia
            const potenciaOptima = Math.min(100, Math.max(30, distancia * 0.08 + 40));
            
            return { angulo: anguloOptimo, potencia: potenciaOptima };
        },
        
        aplicarError: function(valorOptimo, dificultad, maxVariacion) {
            const config = this.dificultades[dificultad];
            const error = (1 - config.precision) * maxVariacion * (Math.random() * 2 - 1);
            return valorOptimo + error;
        }
    };
    
    this.renderLoopTankStars = function() {
        const game = this.tankGame;
        if (!game || !game.activo) return;
        
        this.actualizarTankStars();
        this.renderizarTankStars();
        
        game.animationFrame = requestAnimationFrame(() => this.renderLoopTankStars());
    }
    
    this.actualizarTankStars = function() {
        const game = this.tankGame;
        
        // Actualizar explosiones
        game.explosiones = game.explosiones.filter(e => {
            e.progreso += 0.05;
            return e.progreso < 1;
        });
        
        // Si hay proyectil en vuelo
        if (game.proyectil) {
            const p = game.proyectil;
            
            // Guardar rastro
            p.rastro.push({ x: p.x, y: p.y });
            if (p.rastro.length > 50) p.rastro.shift();
            
            // Calcular distancia recorrida
            const velocidad = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            p.distanciaRecorrida = (p.distanciaRecorrida || 0) + velocidad;
            
            // Verificar si excedió el alcance máximo
            if (p.alcanceMax && p.distanciaRecorrida > p.alcanceMax) {
                // El proyectil pierde fuerza y cae
                p.vy += game.gravedad * 2; // Cae más rápido
                p.vx *= 0.95; // Pierde velocidad horizontal
            } else {
                // Física normal
                p.vy += game.gravedad;
                p.vx += game.viento * 0.02;
            }
            
            p.x += p.vx;
            p.y += p.vy;
            
            // Comprobar colisiones
            this.comprobarColisionesTank();
        }
    }
    
    this.comprobarColisionesTank = function() {
        const game = this.tankGame;
        const p = game.proyectil;
        if (!p) return;
        
        const W = game.canvas.width;
        const H = game.canvas.height;
        
        // Fuera de pantalla
        if (p.x < 0 || p.x > W || p.y > H + 100) {
            game.proyectil = null;
            this.finTurnoTank();
            return;
        }
        
        // Colisión con terreno
        const alturaTerreno = this.getAlturaTerreno(p.x);
        if (p.y >= alturaTerreno) {
            // Explosión con área si es explosivo
            if (p.explosivo && p.radioExplosion) {
                this.explosionAreaTank(p.x, alturaTerreno, p.daño, p.radioExplosion);
            } else {
                this.explosionTank(p.x, alturaTerreno, p.daño);
            }
            game.proyectil = null;
            this.finTurnoTank();
            return;
        }
        
        // Colisión con enemigo
        const objetivo = p.propietario === 'jugador' ? game.enemigo : game.jugador;
        const dx = p.x - objetivo.x;
        const dy = p.y - (objetivo.y - 20);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Radio de impacto según tipo de proyectil
        const radioImpacto = p.explosivo ? 50 : 40;
        
        if (dist < radioImpacto) {
            // Calcular daño basado en distancia al centro (más cerca = más daño)
            let danioFinal = p.daño;
            if (p.explosivo) {
                const multiplicador = 1 - (dist / radioImpacto) * 0.5; // 50% a 100% del daño
                danioFinal = Math.round(p.daño * multiplicador);
            }
            
            // Bonus de daño crítico para francotirador
            if (p.tipoArma === 'francotirador' && Math.random() < 0.2) {
                danioFinal = Math.round(danioFinal * 1.5);
                this.mostrarMensaje('💀 ¡CRÍTICO!');
            }
            
            if (p.explosivo && p.radioExplosion) {
                this.explosionAreaTank(p.x, p.y, danioFinal, p.radioExplosion);
            } else {
                this.explosionTank(p.x, p.y, danioFinal);
            }
            
            objetivo.vida = Math.max(0, objetivo.vida - danioFinal);
            this.actualizarHUDTank();
            game.proyectil = null;
            
            if (objetivo.vida <= 0) {
                this.finalizarTankStars(p.propietario === 'jugador' ? 'victoria' : 'derrota');
            } else {
                this.finTurnoTank();
            }
            return;
        }
        
        // Colisión con obstáculos
        for (let i = game.obstaculos.length - 1; i >= 0; i--) {
            const obs = game.obstaculos[i];
            if (p.x > obs.x && p.x < obs.x + obs.ancho && p.y > obs.y && p.y < obs.y + obs.alto) {
                if (p.explosivo && p.radioExplosion) {
                    this.explosionAreaTank(p.x, p.y, p.daño, p.radioExplosion);
                } else {
                    this.explosionTank(p.x, p.y, p.daño);
                }
                obs.vida -= p.daño;
                if (obs.vida <= 0) {
                    game.obstaculos.splice(i, 1);
                }
                
                // Si es penetrante (francotirador), continúa
                if (p.penetrante) {
                    continue;
                }
                
                game.proyectil = null;
                this.finTurnoTank();
                return;
            }
        }
    }
    
    // Explosión con área de efecto
    this.explosionAreaTank = function(x, y, daño, radio) {
        const game = this.tankGame;
        
        // Añadir explosión visual grande
        game.explosiones.push({
            x, y,
            radio: radio,
            progreso: 0,
            grande: true
        });
        
        // Verificar daño de área al objetivo
        const objetivo = game.turno === 'jugador' ? game.enemigo : game.jugador;
        const dx = x - objetivo.x;
        const dy = y - (objetivo.y - 20);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < radio && dist > 40) { // Solo si no fue impacto directo
            const danioArea = Math.round(daño * 0.5 * (1 - dist / radio));
            if (danioArea > 0) {
                objetivo.vida = Math.max(0, objetivo.vida - danioArea);
                this.actualizarHUDTank();
            }
        }
    }
    
    this.explosionTank = function(x, y, daño) {
        const game = this.tankGame;
        game.explosiones.push({
            x, y,
            radio: 20 + daño / 2,
            progreso: 0
        });
    }
    
    this.finTurnoTank = function() {
        const game = this.tankGame;
        game.fase = 'espera';
        
        // Incrementar número de turno
        game.turnoNumero = (game.turnoNumero || 1) + 1;
        $('#turnoNumero').text(game.turnoNumero);
        
        // Cambiar turno después de un delay
        setTimeout(() => {
            if (!game.activo) return;
            
            // Si es multijugador, manejar diferente
            if (game.esMulti) {
                if (game.turno === 'jugador') {
                    game.turno = 'enemigo';
                    this.actualizarTurnoMultiTank();
                    
                    // Notificar cambio de turno al servidor
                    if (ws && this.tankMultiData) {
                        const nuevoViento = (Math.random() - 0.5) * 2;
                        game.viento = nuevoViento;
                        ws.cambiarTurnoTank(this.tankMultiData.rivalEmail, nuevoViento, game.turnoNumero || 1);
                    }
                } else {
                    game.turno = 'jugador';
                    game.fase = 'mover';
                    // Restaurar combustible parcialmente
                    game.jugador.combustible = Math.min(game.jugador.combustibleMax, game.jugador.combustible + 30);
                    this.actualizarUIFase();
                    this.actualizarTurnoMultiTank();
                }
                return;
            }
            
            // Modo single player (IA)
            if (game.turno === 'jugador') {
                game.turno = 'enemigo';
                $('#turnoIndicador').text('🤖 TURNO ENEMIGO').removeClass('player').addClass('enemy');
                $('#btnDisparar').prop('disabled', true);
                $('#btnMoverIzq, #btnMoverDer, #btnFinMover').prop('disabled', true);
                
                // Cambiar viento
                game.viento = (Math.random() - 0.5) * 2 * (game.mapa.config?.vientoBase || 0.5);
                $('#vientoValor').text(`${game.viento > 0 ? '→' : '←'} ${Math.abs(game.viento * 10).toFixed(1)}`);
                
                // IA dispara después de "pensar"
                const tiempoReaccion = this.BotTankStars.dificultades[this.BotTankStars.dificultadActual].tiempoReaccion;
                setTimeout(() => this.turnoIATank(), tiempoReaccion);
            } else {
                game.turno = 'jugador';
                game.fase = 'mover'; // Empieza con movimiento
                
                // Restaurar combustible parcialmente
                game.jugador.combustible = Math.min(game.jugador.combustibleMax, game.jugador.combustible + 30);
                $('#jugadorFuel').css('width', (game.jugador.combustible / game.jugador.combustibleMax * 100) + '%');
                $('#jugadorFuelTexto, #fuelRestante').text(game.jugador.combustible);
                
                this.actualizarUIFase();
                
                // Cambiar viento
                game.viento = (Math.random() - 0.5) * 2 * (game.mapa.config?.vientoBase || 0.5);
                $('#vientoValor').text(`${game.viento > 0 ? '→' : '←'} ${Math.abs(game.viento * 10).toFixed(1)}`);
            }
        }, 800);
    }
    
    this.turnoIATank = function() {
        const game = this.tankGame;
        if (!game || game.turno !== 'enemigo') return;
        
        const enemigo = game.enemigo;
        const arma = enemigo.tropa.armas?.[enemigo.armaActual] || { daño: 20, tipo: 'cañon' };
        const bot = this.BotTankStars;
        const dificultad = bot.dificultadActual;
        const config = bot.dificultades[dificultad];
        
        // Verificar si está congelado
        const estaCongelado = enemigo.efectos.find(e => e.tipo === 'congelado');
        if (estaCongelado) {
            estaCongelado.turnos--;
            if (estaCongelado.turnos <= 0) {
                enemigo.efectos = enemigo.efectos.filter(e => e.tipo !== 'congelado');
            }
            
            // Penalización por congelación
            config.precision *= 0.6;
            this.mostrarMensaje('❄️ Enemigo ralentizado');
        }
        
        game.fase = 'disparo';
        
        // Calcular disparo óptimo
        const optimo = bot.calcularDisparoOptimo(game);
        
        // Aplicar error según dificultad
        const anguloFinal = bot.aplicarError(optimo.angulo, dificultad, config.variacionAngulo);
        const potenciaFinal = Math.max(20, Math.min(100, 
            bot.aplicarError(optimo.potencia, dificultad, config.variacionPotencia)
        ));
        
        enemigo.angulo = Math.max(0, Math.min(180, anguloFinal));
        enemigo.potencia = potenciaFinal;
        
        // Velocidad basada en el arma
        const velocidadBase = arma.proyectilVelocidad || 14;
        const velocidad = (enemigo.potencia / 100) * velocidadBase * 0.8;
        const anguloRad = enemigo.angulo * Math.PI / 180;
        
        // Daño basado en el arma
        const danioBase = arma.daño || 15;
        const alcanceMax = arma.alcance || 400;
        
        game.proyectil = {
            x: enemigo.x,
            y: enemigo.y - 30,
            vx: Math.cos(anguloRad) * velocidad,
            vy: -Math.sin(anguloRad) * velocidad,
            radio: arma.tipo === 'cañon' ? 12 : arma.tipo === 'francotirador' ? 5 : 8,
            daño: danioBase,
            alcanceMax: alcanceMax,
            distanciaRecorrida: 0,
            propietario: 'enemigo',
            rastro: [],
            tipoArma: arma.tipo,
            explosivo: arma.tipo === 'cañon' || arma.tipo === 'cohetes',
            radioExplosion: arma.radioExplosion || (arma.tipo === 'cañon' ? 60 : arma.tipo === 'cohetes' ? 80 : 0),
            penetrante: arma.tipo === 'francotirador'
        };
    }
    
    this.actualizarHUDTank = function() {
        const game = this.tankGame;
        
        const vidaPctJ = (game.jugador.vida / game.jugador.vidaMax) * 100;
        const vidaPctE = (game.enemigo.vida / game.enemigo.vidaMax) * 100;
        
        $('#jugadorVida').css('width', vidaPctJ + '%');
        $('#jugadorVidaTexto').text(`${Math.round(game.jugador.vida)}/${game.jugador.vidaMax}`);
        
        $('#enemigoVida').css('width', vidaPctE + '%');
        $('#enemigoVidaTexto').text(`${Math.round(game.enemigo.vida)}/${game.enemigo.vidaMax}`);
    }
    
    this.renderizarTankStars = function() {
        const game = this.tankGame;
        const ctx = game.ctx;
        const W = game.canvas.width;
        const H = game.canvas.height;
        const mapa = game.mapa;
        const tipoTerreno = mapa.config?.tipoTerreno || 'colinas';
        
        // 🌅 FONDOS DINÁMICOS SEGÚN MAPA
        const fondos = {
            plano: { top: '#87CEEB', mid: '#98D8C8', bot: '#7CB342' },
            colinas: { top: '#1a1a3e', mid: '#4a6fa5', bot: '#87CEEB' },
            montanas: { top: '#2C3E50', mid: '#5D6D7E', bot: '#85929E' },
            dunas: { top: '#F39C12', mid: '#E67E22', bot: '#D35400' },
            canyon: { top: '#D35400', mid: '#A04000', bot: '#784212' },
            islas: { top: '#1a1a3e', mid: '#2E4053', bot: '#1B2631' },
            volcanico: { top: '#2C3E50', mid: '#641E16', bot: '#1A0A05' },
            hielo: { top: '#AED6F1', mid: '#85C1E9', bot: '#5DADE2' },
            lunar: { top: '#0C0C0C', mid: '#1C1C1C', bot: '#2C2C2C' },
            nuclear: { top: '#1A5276', mid: '#2E86AB', bot: '#58D68D' },
            pantano: { top: '#1E3D33', mid: '#2D5A4A', bot: '#3D7060' },
            trincheras: { top: '#4A4A4A', mid: '#5A5A5A', bot: '#6A6A6A' },
            urbano: { top: '#2C3E50', mid: '#34495E', bot: '#566573' },
            infierno: { top: '#1A0A05', mid: '#641E16', bot: '#D35400' }
        };
        
        const colores = fondos[tipoTerreno] || fondos.colinas;
        
        // Fondo cielo
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, colores.top);
        skyGrad.addColorStop(0.5, colores.mid);
        skyGrad.addColorStop(1, colores.bot);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);
        
        // Efectos atmosféricos según mapa
        this.dibujarEfectosAtmosfericosTank(ctx, tipoTerreno, W, H);
        
        // 🏔️ PLATAFORMAS FLOTANTES (para mapas tipo islas)
        for (const plat of game.plataformas) {
            const platGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.alto);
            platGrad.addColorStop(0, '#6D4C41');
            platGrad.addColorStop(1, '#3E2723');
            ctx.fillStyle = platGrad;
            
            ctx.beginPath();
            ctx.roundRect(plat.x, plat.y, plat.ancho, plat.alto, 5);
            ctx.fill();
            
            // Hierba encima
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(plat.x + 5, plat.y - 5, plat.ancho - 10, 10);
        }
        
        // 🌋 ZONAS ESPECIALES (lava, agua, hielo, etc.)
        for (const zona of game.zonasEspeciales) {
            if (zona.tipo === 'lava') {
                // Lava animada
                const lavaGrad = ctx.createLinearGradient(zona.x, H - 50, zona.x, H);
                lavaGrad.addColorStop(0, '#FF5722');
                lavaGrad.addColorStop(0.5, '#FF9800');
                lavaGrad.addColorStop(1, '#FFE082');
                ctx.fillStyle = lavaGrad;
                ctx.fillRect(zona.x, H - 80, zona.ancho, 80);
                
                // Burbujas de lava
                const tiempo = Date.now() * 0.003;
                for (let i = 0; i < 5; i++) {
                    const bx = zona.x + (i * zona.ancho / 5) + Math.sin(tiempo + i) * 10;
                    const by = H - 40 + Math.sin(tiempo * 2 + i) * 15;
                    ctx.beginPath();
                    ctx.arc(bx, by, 5 + Math.sin(tiempo + i * 2) * 3, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 200, 0, ${0.5 + Math.sin(tiempo) * 0.3})`;
                    ctx.fill();
                }
                
                // Glow
                ctx.shadowColor = '#FF5722';
                ctx.shadowBlur = 20;
                ctx.fillStyle = 'rgba(255, 87, 34, 0.3)';
                ctx.fillRect(zona.x - 10, H - 90, zona.ancho + 20, 10);
                ctx.shadowBlur = 0;
            } else if (zona.tipo === 'agua') {
                ctx.fillStyle = 'rgba(33, 150, 243, 0.7)';
                ctx.fillRect(zona.x, H - 60, zona.ancho, 60);
                
                // Ondas
                const tiempo = Date.now() * 0.002;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    for (let x = zona.x; x < zona.x + zona.ancho; x += 5) {
                        const y = H - 55 - i * 15 + Math.sin(x * 0.05 + tiempo + i) * 5;
                        if (x === zona.x) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
            }
        }
        
        // 🏞️ TERRENO PRINCIPAL
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (const punto of game.terreno) {
            ctx.lineTo(punto.x, punto.y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        
        // Colores de terreno según tipo
        const terrenoColores = {
            plano: ['#7CB342', '#558B2F', '#33691E'],
            colinas: ['#4CAF50', '#388E3C', '#5D4037'],
            montanas: ['#78909C', '#546E7A', '#455A64'],
            dunas: ['#FFD54F', '#FFB300', '#8D6E63'],
            canyon: ['#D84315', '#BF360C', '#5D4037'],
            islas: ['#4CAF50', '#388E3C', '#5D4037'],
            volcanico: ['#424242', '#212121', '#1A0A05'],
            hielo: ['#E3F2FD', '#BBDEFB', '#90CAF9'],
            lunar: ['#616161', '#424242', '#212121'],
            nuclear: ['#76FF03', '#64DD17', '#33691E'],
            pantano: ['#6D4C41', '#5D4037', '#3E2723'],
            trincheras: ['#6D4C41', '#5D4037', '#3E2723'],
            urbano: ['#757575', '#616161', '#424242'],
            infierno: ['#BF360C', '#8D6E63', '#3E2723']
        };
        
        const tColors = terrenoColores[tipoTerreno] || terrenoColores.colinas;
        const groundGrad = ctx.createLinearGradient(0, H - 150, 0, H);
        groundGrad.addColorStop(0, tColors[0]);
        groundGrad.addColorStop(0.3, tColors[1]);
        groundGrad.addColorStop(1, tColors[2]);
        ctx.fillStyle = groundGrad;
        ctx.fill();
        
        // Borde del terreno
        ctx.strokeStyle = this.ajustarBrillo(tColors[0], 0.7);
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < game.terreno.length; i++) {
            const p = game.terreno[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        
        // 🧱 OBSTÁCULOS
        for (const obs of game.obstaculos) {
            if (obs.tipo === 'roca') {
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.moveTo(obs.x + obs.ancho / 2, obs.y);
                ctx.lineTo(obs.x + obs.ancho, obs.y + obs.alto);
                ctx.lineTo(obs.x, obs.y + obs.alto);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#444';
                ctx.stroke();
            } else if (obs.tipo === 'edificio') {
                ctx.fillStyle = '#546E7A';
                ctx.fillRect(obs.x, obs.y, obs.ancho, obs.alto);
                // Ventanas
                ctx.fillStyle = '#FFC107';
                for (let vy = obs.y + 10; vy < obs.y + obs.alto - 10; vy += 20) {
                    for (let vx = obs.x + 5; vx < obs.x + obs.ancho - 10; vx += 15) {
                        ctx.fillRect(vx, vy, 8, 12);
                    }
                }
            } else {
                ctx.fillStyle = '#8D6E63';
                ctx.fillRect(obs.x, obs.y, obs.ancho, obs.alto);
                ctx.strokeStyle = '#5D4037';
                ctx.lineWidth = 2;
                ctx.strokeRect(obs.x, obs.y, obs.ancho, obs.alto);
            }
            
            // Barra de vida del obstáculo
            if (obs.vida < 50) {
                const vidaPct = obs.vida / 50;
                ctx.fillStyle = '#222';
                ctx.fillRect(obs.x, obs.y - 8, obs.ancho, 5);
                ctx.fillStyle = vidaPct > 0.5 ? '#4CAF50' : vidaPct > 0.25 ? '#FFC107' : '#f44336';
                ctx.fillRect(obs.x, obs.y - 8, obs.ancho * vidaPct, 5);
            }
        }
        
        // 🎮 DIBUJAR TANQUES
        this.dibujarTanqueMejorado(ctx, game.jugador, true);
        this.dibujarTanqueMejorado(ctx, game.enemigo, false);
        
        // 💫 PARTÍCULAS
        for (const p of game.particulas || []) {
            ctx.globalAlpha = p.vida;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // 🚀 PROYECTIL Y RASTRO
        if (game.proyectil) {
            const p = game.proyectil;
            
            // Rastro con degradado
            if (p.rastro.length > 1) {
                for (let i = 1; i < p.rastro.length; i++) {
                    const alpha = i / p.rastro.length * 0.6;
                    ctx.strokeStyle = `rgba(255, 200, 0, ${alpha})`;
                    ctx.lineWidth = 1 + (i / p.rastro.length) * 3;
                    ctx.beginPath();
                    ctx.moveTo(p.rastro[i-1].x, p.rastro[i-1].y);
                    ctx.lineTo(p.rastro[i].x, p.rastro[i].y);
                    ctx.stroke();
                }
            }
            
            // Estela de fuego
            ctx.shadowColor = '#FF5722';
            ctx.shadowBlur = 15;
            
            // Proyectil principal
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
            const projGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radio);
            projGrad.addColorStop(0, '#FFEB3B');
            projGrad.addColorStop(0.5, '#FF9800');
            projGrad.addColorStop(1, '#FF5722');
            ctx.fillStyle = projGrad;
            ctx.fill();
            
            ctx.shadowBlur = 0;
        }
        
        // 💥 EXPLOSIONES MEJORADAS
        for (const exp of game.explosiones) {
            const alpha = 1 - exp.progreso;
            const radio = exp.radio * (0.5 + exp.progreso * 1.5);
            
            // Glow exterior
            ctx.shadowColor = '#FF5722';
            ctx.shadowBlur = 30;
            
            // Anillos de expansión
            for (let r = 0; r < 4; r++) {
                ctx.beginPath();
                ctx.arc(exp.x, exp.y, radio * (0.3 + r * 0.25), 0, Math.PI * 2);
                const rAlpha = alpha * (1 - r * 0.2);
                ctx.strokeStyle = `rgba(255, ${100 + r * 40}, 0, ${rAlpha})`;
                ctx.lineWidth = 5 - r;
                ctx.stroke();
            }
            
            // Centro brillante
            const expGrad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radio * 0.6);
            expGrad.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
            expGrad.addColorStop(0.5, `rgba(255, 150, 0, ${alpha * 0.8})`);
            expGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = expGrad;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, radio * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
        }
        
        // 🎯 TRAYECTORIA (solo en turno del jugador)
        if (game.turno === 'jugador' && game.fase === 'apuntar') {
            this.dibujarTrayectoriaTank(ctx);
        }
        
        // Indicador de fase de movimiento
        if (game.turno === 'jugador' && game.fase === 'mover') {
            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
            ctx.beginPath();
            ctx.arc(game.jugador.x, game.jugador.y - 20, 50, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#4CAF50';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Efectos atmosféricos
    this.dibujarEfectosAtmosfericosTank = function(ctx, tipo, W, H) {
        const tiempo = Date.now() * 0.001;
        
        switch(tipo) {
            case 'lunar':
                // Estrellas
                ctx.fillStyle = '#FFF';
                for (let i = 0; i < 50; i++) {
                    const sx = (i * 137.5) % W;
                    const sy = (i * 73.7) % (H * 0.6);
                    const brillo = 0.3 + Math.sin(tiempo + i) * 0.3;
                    ctx.globalAlpha = brillo;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1 + (i % 3), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                
                // Tierra en el cielo
                ctx.beginPath();
                ctx.arc(W - 100, 80, 40, 0, Math.PI * 2);
                const earthGrad = ctx.createRadialGradient(W - 100, 80, 0, W - 100, 80, 40);
                earthGrad.addColorStop(0, '#1E88E5');
                earthGrad.addColorStop(0.7, '#1565C0');
                earthGrad.addColorStop(1, '#0D47A1');
                ctx.fillStyle = earthGrad;
                ctx.fill();
                break;
                
            case 'nuclear':
                // Partículas radioactivas
                ctx.fillStyle = '#76FF03';
                for (let i = 0; i < 20; i++) {
                    const px = (tiempo * 50 + i * 100) % W;
                    const py = 50 + Math.sin(tiempo + i) * 30 + (i % 5) * 50;
                    ctx.globalAlpha = 0.3 + Math.sin(tiempo * 2 + i) * 0.2;
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
                
            case 'hielo':
                // Copos de nieve
                ctx.fillStyle = '#FFF';
                for (let i = 0; i < 30; i++) {
                    const sx = (tiempo * 20 + i * 80) % W;
                    const sy = (tiempo * 30 + i * 50) % H;
                    ctx.globalAlpha = 0.6;
                    ctx.beginPath();
                    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
                
            case 'dunas':
                // Arena volando
                ctx.fillStyle = '#D7CCC8';
                for (let i = 0; i < 15; i++) {
                    const sx = (tiempo * 100 + i * 150) % (W + 100) - 50;
                    const sy = 100 + i * 20 + Math.sin(tiempo + i) * 10;
                    ctx.globalAlpha = 0.4;
                    ctx.beginPath();
                    ctx.ellipse(sx, sy, 8, 3, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
                
            case 'volcanico':
            case 'infierno':
                // Cenizas cayendo
                ctx.fillStyle = '#424242';
                for (let i = 0; i < 25; i++) {
                    const ax = (i * 80) % W;
                    const ay = (tiempo * 40 + i * 30) % H;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.arc(ax, ay, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                
                // Resplandor de lava
                const lavaGlow = ctx.createRadialGradient(W/2, H, 0, W/2, H, 200);
                lavaGlow.addColorStop(0, 'rgba(255, 87, 34, 0.3)');
                lavaGlow.addColorStop(1, 'rgba(255, 87, 34, 0)');
                ctx.fillStyle = lavaGlow;
                ctx.fillRect(0, H - 200, W, 200);
                break;
                
            default:
                // Nubes normales
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                for (let i = 0; i < 5; i++) {
                    const cx = (i * 250 + tiempo * 10) % (W + 100) - 50;
                    ctx.beginPath();
                    ctx.arc(cx, 80 + i * 20, 40, 0, Math.PI * 2);
                    ctx.arc(cx + 30, 70 + i * 20, 35, 0, Math.PI * 2);
                    ctx.arc(cx + 60, 80 + i * 20, 40, 0, Math.PI * 2);
                    ctx.fill();
                }
        }
    }
    
    // Dibujar tanque mejorado con diseño único por tipo
    this.dibujarTanqueMejorado = function(ctx, entidad, esJugador) {
        const x = entidad.x;
        const y = entidad.y;
        const tropa = entidad.tropa;
        const color = esJugador ? '#4CAF50' : '#f44336';
        
        // 🎨 COLORES POR ELEMENTO (Prioridad sobre rareza)
        const elementoColores = {
            'fuego': { primary: '#FF5722', secondary: '#E64A19', accent: '#BF360C', glow: '#FF9800' },
            'hielo': { primary: '#03A9F4', secondary: '#0288D1', accent: '#01579B', glow: '#4FC3F7' },
            'tierra': { primary: '#8D6E63', secondary: '#6D4C41', accent: '#4E342E', glow: '#A1887F' },
            'planta': { primary: '#4CAF50', secondary: '#388E3C', accent: '#1B5E20', glow: '#81C784' },
            'rayo': { primary: '#FFEB3B', secondary: '#FDD835', accent: '#F57F17', glow: '#FFF59D' },
            'electrico': { primary: '#FFEB3B', secondary: '#FDD835', accent: '#F57F17', glow: '#FFF59D' },
            'veneno': { primary: '#9C27B0', secondary: '#7B1FA2', accent: '#4A148C', glow: '#CE93D8' }
        };
        
        // Colores según rareza (fallback)
        const rarezaColores = {
            'Común': { primary: '#78909C', secondary: '#546E7A', accent: '#37474F', glow: '#B0BEC5' },
            'Raro': { primary: '#42A5F5', secondary: '#1E88E5', accent: '#1565C0', glow: '#90CAF9' },
            'Épico': { primary: '#AB47BC', secondary: '#8E24AA', accent: '#6A1B9A', glow: '#CE93D8' },
            'Mítico': { primary: '#EF5350', secondary: '#E53935', accent: '#C62828', glow: '#EF9A9A' },
            'Legendario': { primary: '#FFD54F', secondary: '#FFC107', accent: '#FF8F00', glow: '#FFE082' }
        };
        
        // Usar colores de elemento si existe, sino usar rareza
        const colores = (tropa.elemento && elementoColores[tropa.elemento]) 
            ? elementoColores[tropa.elemento] 
            : (rarezaColores[tropa.rareza] || rarezaColores['Común']);
        
        // 🌟 AURA/GLOW por elemento (efecto visual distintivo)
        if (colores.glow) {
            ctx.save();
            ctx.shadowColor = colores.glow;
            ctx.shadowBlur = 20;
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = colores.primary;
            ctx.beginPath();
            ctx.ellipse(x, y - 25, 50, 35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 40, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Orugas
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.roundRect(x - 40, y - 10, 80, 22, 8);
        ctx.fill();
        
        // Detalles de orugas
        ctx.fillStyle = '#333';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(x - 36 + i * 10, y - 8, 5, 18);
        }
        
        // Cuerpo del tanque con degradado
        const bodyGrad = ctx.createLinearGradient(x - 35, y - 45, x + 35, y - 10);
        bodyGrad.addColorStop(0, colores.primary);
        bodyGrad.addColorStop(0.5, colores.secondary);
        bodyGrad.addColorStop(1, colores.accent);
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.moveTo(x - 35, y - 10);
        ctx.lineTo(x - 28, y - 45);
        ctx.lineTo(x + 28, y - 45);
        ctx.lineTo(x + 35, y - 10);
        ctx.closePath();
        ctx.fill();
        
        // Borde del cuerpo
        ctx.strokeStyle = colores.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Detalles del cuerpo
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x - 25, y - 40, 50, 5);
        
        // Torreta
        ctx.fillStyle = colores.secondary;
        ctx.beginPath();
        ctx.arc(x, y - 38, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colores.accent;
        ctx.stroke();
        
        // Cañón - apunta hacia arriba y hacia el enemigo
        // Jugador (izquierda): cañón hacia derecha y arriba
        // Enemigo (derecha): cañón hacia izquierda y arriba
        // En multijugador, el enemigo usa el ángulo sincronizado
        const game = this.tankGame;
        let anguloUsado;
        if (esJugador) {
            anguloUsado = entidad.angulo;
        } else {
            // Para el enemigo, usar ángulo sincronizado si existe (multijugador)
            anguloUsado = (game && game.esMulti && game.anguloEnemigo !== undefined) 
                ? game.anguloEnemigo 
                : (entidad.angulo || 45);
        }
        const anguloRad = anguloUsado * Math.PI / 180;
        const canonLen = 45;
        const direccionX = esJugador ? 1 : -1; // Jugador dispara a derecha, enemigo a izquierda
        const canonX = x + direccionX * Math.cos(anguloRad) * canonLen;
        const canonY = y - 38 - Math.sin(anguloRad) * canonLen; // Negativo para ir hacia arriba
        
        // Cañón exterior
        ctx.strokeStyle = colores.accent;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - 38);
        ctx.lineTo(canonX, canonY);
        ctx.stroke();
        
        // Cañón interior
        ctx.strokeStyle = colores.primary;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x, y - 38);
        ctx.lineTo(canonX, canonY);
        ctx.stroke();
        
        // Boca del cañón
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(canonX, canonY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Brillo indicador de jugador/enemigo
        ctx.fillStyle = esJugador ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y - 38, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Emoji encima
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFF';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(tropa.emoji, x, y - 72);
        ctx.shadowBlur = 0;
        
        // Indicador de rareza
        const rarezaEmojis = { 'Común': '⭐', 'Raro': '⭐⭐', 'Épico': '💎', 'Mítico': '🔥', 'Legendario': '👑' };
        ctx.font = '12px Arial';
        ctx.fillText(rarezaEmojis[tropa.rareza] || '', x, y - 88);
        
        // Barra de vida sobre el tanque
        const vidaPct = entidad.vida / entidad.vidaMax;
        const barWidth = 60;
        const barX = x - barWidth/2;
        const barY = y - 105;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, 8);
        
        ctx.fillStyle = vidaPct > 0.6 ? '#4CAF50' : vidaPct > 0.3 ? '#FFC107' : '#f44336';
        ctx.fillRect(barX, barY, barWidth * vidaPct, 8);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, 8);
    }
    
    this.dibujarTanque = function(ctx, entidad, color, esJugador) {
        const x = entidad.x;
        const y = entidad.y;
        
        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 35, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Orugas
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 35, y - 15, 70, 20);
        ctx.fillStyle = '#222';
        for (let i = 0; i < 7; i++) {
            ctx.fillRect(x - 32 + i * 10, y - 13, 6, 16);
        }
        
        // Cuerpo del tanque
        const bodyGrad = ctx.createLinearGradient(x - 30, y - 40, x + 30, y - 15);
        bodyGrad.addColorStop(0, color);
        bodyGrad.addColorStop(1, this.ajustarBrillo(color, 0.7));
        ctx.fillStyle = bodyGrad;
        
        ctx.beginPath();
        ctx.moveTo(x - 30, y - 15);
        ctx.lineTo(x - 25, y - 40);
        ctx.lineTo(x + 25, y - 40);
        ctx.lineTo(x + 30, y - 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Torreta
        ctx.fillStyle = this.ajustarBrillo(color, 0.9);
        ctx.beginPath();
        ctx.arc(x, y - 35, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Cañón - apunta hacia arriba y hacia el enemigo
        const anguloRad = entidad.angulo * Math.PI / 180;
        const canonLen = 40;
        const direccionX = esJugador ? 1 : -1; // Jugador dispara a derecha, enemigo a izquierda
        const canonX = x + direccionX * Math.cos(anguloRad) * canonLen;
        const canonY = y - 35 - Math.sin(anguloRad) * canonLen; // Negativo para ir hacia arriba
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x, y - 35);
        ctx.lineTo(canonX, canonY);
        ctx.stroke();
        
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, y - 35);
        ctx.lineTo(canonX, canonY);
        ctx.stroke();
        
        // Emoji encima
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(entidad.tropa.emoji, x, y - 65);
    }
    
    this.dibujarTrayectoriaTank = function(ctx) {
        const game = this.tankGame;
        const jugador = game.jugador;
        
        // El cañón apunta hacia el enemigo (derecha para jugador)
        const anguloRad = jugador.angulo * Math.PI / 180;
        const velocidad = jugador.potencia * 0.15;
        
        // Calcular posición de la boca del cañón (igual que en dibujarTanqueMejorado)
        const canonLen = 45;
        const direccionX = 1; // Jugador dispara a la derecha
        const bocaCanonX = jugador.x + direccionX * Math.cos(anguloRad) * canonLen;
        const bocaCanonY = jugador.y - 38 - Math.sin(anguloRad) * canonLen;
        
        // Empezar trayectoria desde la boca del cañón
        let x = bocaCanonX;
        let y = bocaCanonY;
        let vx = Math.cos(anguloRad) * velocidad;
        let vy = -Math.sin(anguloRad) * velocidad; // Negativo para ir hacia arriba
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // Simular trayectoria
        for (let i = 0; i < 60; i++) {
            vy += game.gravedad;
            vx += game.viento * 0.02;
            x += vx;
            y += vy;
            
            if (y > this.getAlturaTerreno(x) || x < 0 || x > game.canvas.width) break;
            
            ctx.lineTo(x, y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    this.finalizarTankStars = function(resultado) {
        const game = this.tankGame;
        game.activo = false;
        
        if (game.animationFrame) {
            cancelAnimationFrame(game.animationFrame);
        }
        
        // Si es multijugador, notificar al servidor
        if (game.esMulti && ws && this.tankMultiData) {
            const miEmail = $.cookie('nick');
            const rivalEmail = this.tankMultiData.rivalEmail;
            
            // Determinar ganador/perdedor
            let ganadorEmail, perdedorEmail;
            if (resultado === 'victoria') {
                ganadorEmail = miEmail;
                perdedorEmail = rivalEmail;
            } else if (resultado === 'derrota') {
                ganadorEmail = rivalEmail;
                perdedorEmail = miEmail;
            }
            
            // Enviar finalización al servidor (solo el ganador envía para evitar duplicados)
            if (resultado === 'victoria') {
                ws.finalizarPartida(ganadorEmail, perdedorEmail, false, {
                    vidaGanador: game.jugador.vida,
                    vidaPerdedor: game.enemigo.vida,
                    turnos: game.turnoNumero || 1
                });
            }
            
            // El resultado detallado vendrá del servidor vía 'resultadosPartida'
            // Mostrar pantalla de espera
            const html = `
                <div class="game-end-overlay">
                    <div class="game-end-content">
                        <h1>${resultado === 'victoria' ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}</h1>
                        <div class="end-stats">
                            <p>Tu vida restante: ${Math.round(game.jugador.vida)}/${game.jugador.vidaMax}</p>
                            <p style="color: #888; margin-top: 10px;">⏳ Procesando recompensas...</p>
                        </div>
                    </div>
                </div>
            `;
            $('#tankStarsGame').append(html);
            return;
        }
        
        // Modo single player - registrar estadísticas 1P (sin copas)
        if (!this.datosJugador.stats1P) {
            this.datosJugador.stats1P = { victorias: 0, derrotas: 0 };
        }
        
        let oroGanado = 0;
        let xpGanada = 0;
        
        if (resultado === 'victoria') {
            this.datosJugador.stats1P.victorias++;
            oroGanado = 100;
            xpGanada = 25;
        } else {
            this.datosJugador.stats1P.derrotas++;
            oroGanado = 25;
            xpGanada = 10;
        }
        
        this.datosJugador.monedas += oroGanado;
        this.datosJugador.xp += xpGanada;
        this.verificarSubidaNivel();
        this.actualizarMonedas();
        this.actualizarPerfilStats();
        this.guardarProgreso();
        
        // Modo single player - mostrar resultado normal
        const html = `
            <div class="game-end-overlay">
                <div class="game-end-content">
                    <h1>${resultado === 'victoria' ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}</h1>
                    <div class="end-stats">
                        <p>Tu vida restante: ${Math.round(game.jugador.vida)}/${game.jugador.vidaMax}</p>
                        <p style="margin-top: 10px;">Oro: +${oroGanado} 💰 | XP: +${xpGanada} ⭐</p>
                        <p style="color: #888; font-size: 0.8rem;">💡 Las copas solo se ganan en Multijugador</p>
                    </div>
                    <div class="end-buttons">
                        <button class="btn-end-play" onclick="cw.reiniciarTankStars()">🔄 Jugar de Nuevo</button>
                        <button class="btn-end-menu" onclick="cw.salirTankStars()">🏠 Menú</button>
                    </div>
                </div>
            </div>
        `;
        
        $('#tankStarsGame').append(html);
    }
    
    this.reiniciarTankStars = function() {
        const tropaId = this.shooterSeleccion.tropa;
        const mapaId = this.shooterSeleccion.mapa;
        this.salirTankStars();
        this.iniciarTankStars(tropaId, mapaId);
    }
    
    this.salirTankStars = function() {
        const game = this.tankGame;
        
        if (game) {
            game.activo = false;
            if (game.animationFrame) {
                cancelAnimationFrame(game.animationFrame);
            }
        }
        
        $(document).off('.tankstars');
        $('#tankStarsGame').remove();
        
        // Restaurar UI
        $('.game-container').show();
        $('#googleSigninContainer').show();
        $('#rankingPanel').show();
        $('#profileIcon').show();
        
        this.tankGame = null;
        this.mostrarPanelShooterDominio('tierra');
    }
    
    this.getEnemigoAleatorio = function(dominio) {
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const disponibles = tropas.filter(t => t.desbloqueado);
        return disponibles[Math.floor(Math.random() * disponibles.length)] || tropas[0];
    }

    // ==========================================
    // SPACE INVADERS - AIRE
    // ==========================================
    
    // ==========================================
    // ✈️ SPACE INVADERS v3.0 - ARCADE SIMPLE PARA BETA
    // ==========================================
    
    this.iniciarSpaceInvaders = function(tropaId, mapaId, dificultadOrNivel, nivel) {
        console.log("🚀 Iniciando Space Invaders Beta...");
        
        // Limpiar juego anterior
        if (this.spaceGame) {
            cancelAnimationFrame(this.spaceGame.animationFrame);
            this.spaceGame = null;
        }
        $('#spaceInvadersGame').remove();
        $(document).off('.spaceinvaders');
        
        // Ocultar UI principal
        $('.game-container').hide();
        $('#googleSigninContainer').hide();
        $('#rankingPanel').hide();
        $('#profileIcon').hide();
        
        const W = 800;
        const H = 550;
        
        // Powerups de la tienda (todos desbloqueados)
        const powerupsConfig = [
            { emoji: '❤️', tipo: 'vida', nombre: '+1 Vida', color: '#f44336' },
            { emoji: '🛡️', tipo: 'escudo', nombre: 'Escudo', color: '#2196F3', duracion: 8000 },
            { emoji: '⚡', tipo: 'rapidfire', nombre: 'Disparo Rápido', color: '#FFC107', duracion: 10000 },
            { emoji: '🔥', tipo: 'triple', nombre: 'Triple Disparo', color: '#FF5722', duracion: 8000 },
            { emoji: '💣', tipo: 'bomba', nombre: 'Bomba Nuclear', color: '#9C27B0' }
        ];
        
        // Tipos de enemigos simples
        const tiposConfig = [
            { emoji: '👾', vida: 1, puntos: 10, velocidad: 1.5 },
            { emoji: '👽', vida: 2, puntos: 25, velocidad: 2.0 },
            { emoji: '🛸', vida: 3, puntos: 50, velocidad: 2.5 }
        ];
        
        this.spaceGame = {
            activo: true,
            W: W, H: H,
            nave: {
                x: W / 2, y: H - 50, ancho: 40, alto: 40, velocidad: 8,
                vidas: 3, escudo: false, escudoHasta: 0,
                disparoRapido: false, disparoRapidoHasta: 0,
                tripleDisparo: false, tripleDisparoHasta: 0
            },
            enemigos: [], proyectiles: [], proyectilesEnemigos: [],
            powerups: [], explosiones: [], estrellas: [],
            puntuacion: 0, oleada: 1, enemigosMatados: 0, enemigosPorOleada: 10,
            ultimoDisparo: 0, cadenciaBase: 250, ultimoPowerup: 0,
            keys: { left: false, right: false, space: false },
            powerupsConfig: powerupsConfig, tiposConfig: tiposConfig,
            canvas: null, ctx: null, animationFrame: null
        };
        
        // Generar estrellas
        for (let i = 0; i < 80; i++) {
            this.spaceGame.estrellas.push({
                x: Math.random() * W, y: Math.random() * H,
                size: Math.random() * 2 + 0.5, speed: Math.random() * 1.5 + 0.5
            });
        }
        
        // Crear UI
        const html = `
            <div id="spaceInvadersGame" style="position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(#0a0a1a,#1a1a3e);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <div style="display:flex;justify-content:space-between;width:${W}px;padding:15px 0;color:#fff;font-family:Arial;">
                    <div style="font-size:18px;">🎯 Puntos: <span id="spacePuntos" style="color:#FFD700;font-weight:bold;">0</span></div>
                    <div style="font-size:18px;">🌊 Oleada: <span id="spaceOleada" style="color:#4FC3F7;font-weight:bold;">1</span></div>
                    <div id="spaceVidas" style="font-size:22px;">❤️❤️❤️</div>
                </div>
                <canvas id="spaceCanvas" width="${W}" height="${H}" style="border:3px solid #333;border-radius:10px;box-shadow:0 0 30px rgba(0,100,255,0.3);"></canvas>
                <div style="color:#aaa;margin-top:15px;font-size:14px;">⬅️ ➡️ Flechas para mover | ESPACIO para disparar | ESC para salir</div>
                <div id="spacePowerupsActivos" style="color:#fff;margin-top:10px;font-size:16px;"></div>
                <button onclick="cw.salirSpaceInvaders()" style="margin-top:15px;padding:12px 35px;background:linear-gradient(#f44336,#d32f2f);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:bold;">✕ Salir al Menú</button>
            </div>
        `;
        $('body').append(html);
        
        this.spaceGame.canvas = document.getElementById('spaceCanvas');
        this.spaceGame.ctx = this.spaceGame.canvas.getContext('2d');
        
        // Dar foco al contenedor del juego
        $('#spaceInvadersGame').attr('tabindex', '0').focus();
        
        // Controles teclado (en window para capturar siempre)
        this.spaceGame.keyHandler = (e) => {
            const g = this.spaceGame;
            if (!g || !g.activo) return;
            
            const key = e.key || e.code;
            
            // Prevenir scroll con flechas y espacio
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Space'].includes(key)) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            if (e.type === 'keydown') {
                if (key === 'ArrowLeft' || key === 'KeyA') g.keys.left = true;
                if (key === 'ArrowRight' || key === 'KeyD') g.keys.right = true;
                if (key === ' ' || key === 'Space' || key === 'ArrowUp' || key === 'KeyW') g.keys.space = true;
                if (key === 'Escape') this.salirSpaceInvaders();
            } else if (e.type === 'keyup') {
                if (key === 'ArrowLeft' || key === 'KeyA') g.keys.left = false;
                if (key === 'ArrowRight' || key === 'KeyD') g.keys.right = false;
                if (key === ' ' || key === 'Space' || key === 'ArrowUp' || key === 'KeyW') g.keys.space = false;
            }
        };
        
        window.addEventListener('keydown', this.spaceGame.keyHandler, true);
        window.addEventListener('keyup', this.spaceGame.keyHandler, true);
        
        // También clic para disparar
        $(this.spaceGame.canvas).on('click.spaceinvaders', () => {
            const g = this.spaceGame;
            if (!g || !g.activo) return;
            const ahora = Date.now();
            const cadencia = g.nave.disparoRapido ? 100 : g.cadenciaBase;
            if (ahora - g.ultimoDisparo > cadencia) {
                g.ultimoDisparo = ahora;
                if (g.nave.tripleDisparo) {
                    g.proyectiles.push({ x: g.nave.x - 20, y: g.nave.y - 25, vel: 14 });
                    g.proyectiles.push({ x: g.nave.x, y: g.nave.y - 25, vel: 14 });
                    g.proyectiles.push({ x: g.nave.x + 20, y: g.nave.y - 25, vel: 14 });
                } else {
                    g.proyectiles.push({ x: g.nave.x, y: g.nave.y - 25, vel: 14 });
                }
            }
        });
        
        // Generar primera oleada
        this.generarOleadaBeta();
        
        // Game loop
        const gameLoop = () => {
            const g = this.spaceGame;
            if (!g || !g.activo) return;
            
            this.actualizarSpaceBeta();
            this.renderizarSpaceBeta();
            
            g.animationFrame = requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
    
    this.generarOleadaBeta = function() {
        const g = this.spaceGame;
        const cantidad = g.enemigosPorOleada + (g.oleada - 1) * 3;
        const cols = Math.min(cantidad, 10);
        const filas = Math.ceil(cantidad / cols);
        const espacioX = (g.W - 100) / cols;
        
        for (let fila = 0; fila < filas; fila++) {
            for (let col = 0; col < cols && g.enemigos.length < cantidad; col++) {
                const tipoIdx = Math.min(fila, g.tiposConfig.length - 1);
                const tipo = g.tiposConfig[tipoIdx];
                g.enemigos.push({
                    x: 60 + col * espacioX, y: -50 - fila * 55,
                    emoji: tipo.emoji, vida: tipo.vida,
                    puntos: tipo.puntos * g.oleada,
                    velocidadY: tipo.velocidad + (g.oleada * 0.15),
                    velocidadX: (Math.random() - 0.5) * 1.5
                });
            }
        }
    }
    
    this.actualizarSpaceBeta = function() {
        const g = this.spaceGame;
        const nave = g.nave;
        const ahora = Date.now();
        
        // Mover estrellas
        for (const s of g.estrellas) {
            s.y += s.speed;
            if (s.y > g.H) { s.y = 0; s.x = Math.random() * g.W; }
        }
        
        // Mover nave
        if (g.keys.left) nave.x = Math.max(25, nave.x - nave.velocidad);
        if (g.keys.right) nave.x = Math.min(g.W - 25, nave.x + nave.velocidad);
        
        // Disparar
        const cadencia = nave.disparoRapido ? 100 : g.cadenciaBase;
        if (g.keys.space && ahora - g.ultimoDisparo > cadencia) {
            g.ultimoDisparo = ahora;
            if (nave.tripleDisparo) {
                g.proyectiles.push({ x: nave.x - 20, y: nave.y - 25, vel: 14 });
                g.proyectiles.push({ x: nave.x, y: nave.y - 25, vel: 14 });
                g.proyectiles.push({ x: nave.x + 20, y: nave.y - 25, vel: 14 });
            } else {
                g.proyectiles.push({ x: nave.x, y: nave.y - 25, vel: 14 });
            }
        }
        
        // Verificar powerups expirados
        if (nave.escudo && ahora > nave.escudoHasta) nave.escudo = false;
        if (nave.disparoRapido && ahora > nave.disparoRapidoHasta) nave.disparoRapido = false;
        if (nave.tripleDisparo && ahora > nave.tripleDisparoHasta) nave.tripleDisparo = false;
        
        // Actualizar UI powerups
        let pwActivos = [];
        if (nave.escudo) pwActivos.push('🛡️ Escudo');
        if (nave.disparoRapido) pwActivos.push('⚡ Rápido');
        if (nave.tripleDisparo) pwActivos.push('🔥 Triple');
        $('#spacePowerupsActivos').html(pwActivos.length ? 'Activos: ' + pwActivos.join(' | ') : '');
        
        // Mover proyectiles jugador
        for (let i = g.proyectiles.length - 1; i >= 0; i--) {
            g.proyectiles[i].y -= g.proyectiles[i].vel;
            if (g.proyectiles[i].y < -10) g.proyectiles.splice(i, 1);
        }
        
        // Mover enemigos
        for (let i = g.enemigos.length - 1; i >= 0; i--) {
            const e = g.enemigos[i];
            e.y += e.velocidadY;
            e.x += e.velocidadX;
            if (e.x < 30 || e.x > g.W - 30) e.velocidadX *= -1;
            
            // Colisión directa enemigo vs nave (hitbox más pequeño)
            const distX = Math.abs(e.x - nave.x);
            const distY = Math.abs(e.y - nave.y);
            if (distX < 22 && distY < 22) {
                g.enemigos.splice(i, 1);
                g.explosiones.push({ x: e.x, y: e.y, frame: 0 });
                if (!nave.escudo) {
                    nave.vidas--;
                    $('#spaceVidas').html('❤️'.repeat(Math.max(0, nave.vidas)));
                    if (nave.vidas <= 0) { this.finSpaceBeta(false); return; }
                }
                continue;
            }
            
            // Si el enemigo sale por abajo, simplemente desaparece (escapó)
            if (e.y > g.H + 30) {
                g.enemigos.splice(i, 1);
            }
            
            // Disparo enemigo
            if (Math.random() < 0.003 && e.y > 50) {
                g.proyectilesEnemigos.push({ x: e.x, y: e.y + 20, vel: 5 + g.oleada * 0.3 });
            }
        }
        
        // Mover proyectiles enemigos
        for (let i = g.proyectilesEnemigos.length - 1; i >= 0; i--) {
            g.proyectilesEnemigos[i].y += g.proyectilesEnemigos[i].vel;
            if (g.proyectilesEnemigos[i].y > g.H + 10) g.proyectilesEnemigos.splice(i, 1);
        }
        
        // Mover powerups
        for (let i = g.powerups.length - 1; i >= 0; i--) {
            g.powerups[i].y += 2.5;
            if (g.powerups[i].y > g.H + 30) g.powerups.splice(i, 1);
        }
        
        // Spawn powerups
        if (ahora - g.ultimoPowerup > 6000 && Math.random() < 0.4) {
            g.ultimoPowerup = ahora;
            const pw = g.powerupsConfig[Math.floor(Math.random() * g.powerupsConfig.length)];
            g.powerups.push({ x: 60 + Math.random() * (g.W - 120), y: -30, ...pw });
        }
        
        // Colisiones proyectiles vs enemigos
        for (let i = g.proyectiles.length - 1; i >= 0; i--) {
            const p = g.proyectiles[i];
            for (let j = g.enemigos.length - 1; j >= 0; j--) {
                const e = g.enemigos[j];
                if (Math.abs(p.x - e.x) < 28 && Math.abs(p.y - e.y) < 28) {
                    g.proyectiles.splice(i, 1);
                    e.vida--;
                    if (e.vida <= 0) {
                        g.explosiones.push({ x: e.x, y: e.y, frame: 0 });
                        g.puntuacion += e.puntos;
                        g.enemigosMatados++;
                        g.enemigos.splice(j, 1);
                        $('#spacePuntos').text(g.puntuacion);
                    }
                    break;
                }
            }
        }
        
        // Colisiones proyectiles enemigos vs nave
        for (let i = g.proyectilesEnemigos.length - 1; i >= 0; i--) {
            const p = g.proyectilesEnemigos[i];
            if (Math.abs(p.x - nave.x) < 28 && Math.abs(p.y - nave.y) < 28) {
                g.proyectilesEnemigos.splice(i, 1);
                if (!nave.escudo) {
                    nave.vidas--;
                    $('#spaceVidas').html('❤️'.repeat(Math.max(0, nave.vidas)));
                    if (nave.vidas <= 0) { this.finSpaceBeta(false); return; }
                }
            }
        }
        
        // Colisiones powerups vs nave
        for (let i = g.powerups.length - 1; i >= 0; i--) {
            const pw = g.powerups[i];
            if (Math.abs(pw.x - nave.x) < 35 && Math.abs(pw.y - nave.y) < 35) {
                g.powerups.splice(i, 1);
                switch (pw.tipo) {
                    case 'vida':
                        nave.vidas = Math.min(nave.vidas + 1, 5);
                        $('#spaceVidas').html('❤️'.repeat(nave.vidas));
                        break;
                    case 'escudo':
                        nave.escudo = true;
                        nave.escudoHasta = ahora + (pw.duracion || 8000);
                        break;
                    case 'rapidfire':
                        nave.disparoRapido = true;
                        nave.disparoRapidoHasta = ahora + (pw.duracion || 10000);
                        break;
                    case 'triple':
                        nave.tripleDisparo = true;
                        nave.tripleDisparoHasta = ahora + (pw.duracion || 8000);
                        break;
                    case 'bomba':
                        g.enemigos.forEach(e => {
                            g.explosiones.push({ x: e.x, y: e.y, frame: 0 });
                            g.puntuacion += e.puntos;
                        });
                        g.enemigos = [];
                        $('#spacePuntos').text(g.puntuacion);
                        break;
                }
            }
        }
        
        // Siguiente oleada
        if (g.enemigos.length === 0) {
            g.oleada++;
            $('#spaceOleada').text(g.oleada);
            if (g.oleada > 5) { this.finSpaceBeta(true); }
            else { this.generarOleadaBeta(); }
        }
        
        // Actualizar explosiones
        for (let i = g.explosiones.length - 1; i >= 0; i--) {
            g.explosiones[i].frame++;
            if (g.explosiones[i].frame > 20) g.explosiones.splice(i, 1);
        }
    }
    
    this.renderizarSpaceBeta = function() {
        const g = this.spaceGame;
        const ctx = g.ctx;
        const nave = g.nave;
        
        // Fondo
        const grad = ctx.createLinearGradient(0, 0, 0, g.H);
        grad.addColorStop(0, '#0a0a1a');
        grad.addColorStop(0.5, '#0f0f2d');
        grad.addColorStop(1, '#1a1a3e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, g.W, g.H);
        
        // Estrellas
        for (const s of g.estrellas) {
            ctx.globalAlpha = 0.4 + Math.random() * 0.6;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Nave
        ctx.save();
        ctx.font = '45px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (nave.escudo) {
            ctx.beginPath();
            ctx.arc(nave.x, nave.y, 35, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(33, 150, 243, ${0.5 + Math.sin(Date.now() * 0.01) * 0.3})`;
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = 'rgba(33, 150, 243, 0.15)';
            ctx.fill();
        }
        ctx.shadowColor = '#4FC3F7';
        ctx.shadowBlur = 15;
        ctx.fillText('🛩️', nave.x, nave.y);
        ctx.restore();
        
        // Proyectiles jugador
        ctx.fillStyle = '#4FC3F7';
        for (const p of g.proyectiles) {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 4, 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Proyectiles enemigos
        ctx.fillStyle = '#f44336';
        for (const p of g.proyectilesEnemigos) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Enemigos
        ctx.font = '38px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const e of g.enemigos) {
            ctx.fillText(e.emoji, e.x, e.y);
        }
        
        // Powerups
        ctx.font = '32px Arial';
        for (const pw of g.powerups) {
            ctx.beginPath();
            ctx.arc(pw.x, pw.y, 22, 0, Math.PI * 2);
            ctx.fillStyle = pw.color + '55';
            ctx.fill();
            ctx.strokeStyle = pw.color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillText(pw.emoji, pw.x, pw.y);
        }
        
        // Explosiones
        for (const ex of g.explosiones) {
            const size = 25 + ex.frame * 2.5;
            const alpha = 1 - (ex.frame / 20);
            ctx.font = `${Math.floor(size)}px Arial`;
            ctx.globalAlpha = alpha;
            ctx.fillText('💥', ex.x, ex.y);
        }
        ctx.globalAlpha = 1;
    }
    
    this.finSpaceBeta = function(victoria) {
        const g = this.spaceGame;
        if (!g) return;
        g.activo = false;
        cancelAnimationFrame(g.animationFrame);
        
        const msg = victoria 
            ? `<h2 style="color:#4CAF50;margin:0 0 20px 0;">🎉 ¡VICTORIA!</h2><p>Has completado las 5 oleadas</p>`
            : `<h2 style="color:#f44336;margin:0 0 20px 0;">💀 Game Over</h2><p>Los invasores te derrotaron</p>`;
        
        const overlay = `
            <div id="spaceOverlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:100;">
                <div style="background:linear-gradient(#1a1a2e,#0f0f1f);padding:45px 60px;border-radius:20px;text-align:center;color:#fff;border:2px solid #333;">
                    ${msg}
                    <p style="font-size:28px;color:#FFD700;margin:20px 0;">🎯 Puntuación: ${g.puntuacion}</p>
                    <p style="font-size:16px;color:#aaa;">🌊 Oleadas: ${g.oleada - 1} | 👾 Enemigos: ${g.enemigosMatados}</p>
                    <div style="margin-top:30px;">
                        <button onclick="cw.reiniciarSpaceBeta()" style="margin:5px;padding:15px 35px;background:linear-gradient(#4CAF50,#388E3C);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:18px;font-weight:bold;">🔄 Jugar de Nuevo</button>
                        <button onclick="cw.salirSpaceInvaders()" style="margin:5px;padding:15px 35px;background:linear-gradient(#2196F3,#1976D2);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:18px;font-weight:bold;">🏠 Menú Principal</button>
                    </div>
                </div>
            </div>
        `;
        $('#spaceInvadersGame').append(overlay);
    }
    
    this.reiniciarSpaceBeta = function() {
        this.salirSpaceInvaders();
        this.iniciarSpaceInvaders();
    }
    
    this.salirSpaceInvaders = function() {
        if (this.spaceGame) {
            this.spaceGame.activo = false;
            cancelAnimationFrame(this.spaceGame.animationFrame);
            // Limpiar event listeners de teclado (window, no document)
            if (this.spaceGame.keyHandler) {
                window.removeEventListener('keydown', this.spaceGame.keyHandler, true);
                window.removeEventListener('keyup', this.spaceGame.keyHandler, true);
            }
            this.spaceGame = null;
        }
        $('#spaceInvadersGame').remove();
        $(document).off('.spaceinvaders');
        $('.game-container').show();
        $('#googleSigninContainer').show();
        $('#rankingPanel').show();
        $('#profileIcon').show();
        this.mostrarMenuDominio('aire');
    }
    
    // Funciones legacy (compatibilidad)
    this.generarEstrellasSpaceInvaders = function() {}
    this.crearInterfazSpaceInvaders = function() {}
    this.iniciarControlesSpaceInvaders = function() {}
    this.iniciarOleadaSpaceInvaders = function() {}
    this.mostrarMensajeOleadaSpace = function() {}
    this.verificarOleadaCompletadaSpace = function() {}
    this.dropPowerupNivel = function() {}
    this.spawnEnemigosSpace = function() {}
    this.spawnItemsSpace = function() {}
    this.spaceControlStart = function(c) { if(this.spaceGame) this.spaceGame.keys[c] = true; }
    this.spaceControlEnd = function(c) { if(this.spaceGame) this.spaceGame.keys[c] = false; }
    this.usarSuperpoderSpace = function() {}
    this.pausarSpaceInvaders = function() {}
    this.gameLoopSpaceInvaders = function() {}
    this.actualizarSpaceInvaders = function() {}
    this.avanzarNivelSpace = function() {}
    this.mostrarNotificacionSpace = function() {}
    this.aplicarItemSpace = function() {}
    this.renderizarSpaceInvaders = function() {}
    this.finalizarSpaceInvaders = function(v) { this.finSpaceBeta(v); }
    this.reiniciarSpaceInvaders = function() { this.reiniciarSpaceBeta(); }

    // ==========================================
    // BATALLA NAVAL - MAR (Hundir la flota)
    // ==========================================
    
    this.iniciarBatallaNaval = function(tropaId, mapaId, dificultad) {
        // Ocultar UI principal
        $('.game-container').hide();
        $('#googleSigninContainer').hide();
        $('#rankingPanel').hide();
        $('#profileIcon').hide();
        
        const GRID_SIZE = 12; // Tablero 12x12 para 7 barcos
        const mapa = this.mapasShooter.mar.find(m => m.id === mapaId) || { nombre: 'Océano', emoji: '🌊', rareza: 'Común' };
        const nivelIA = dificultad || this.shooterSeleccion?.dificultad || 'normal';
        
        // Configuración de barcos con superpoderes y VIDA POR TROZO
        // ==========================================
        // 7 BARCOS: de 1 a 7 casillas con superpoderes de área
        // Sistema de daño: amarillo → naranja → rojo
        // ==========================================
        const barcosConfig = [
            { 
                nombre: 'Lancha', tamaño: 1, emoji: '🚤', 
                rareza: 'Común',
                vidaPorTrozo: 1,
                superpoder: {
                    nombre: '🎯 Disparo Preciso',
                    descripcion: 'Ataca 1 casilla garantizado',
                    tipo: 'area',
                    area: 1,
                    daño: 1
                }
            },
            { 
                nombre: 'Patrullero', tamaño: 2, emoji: '🛥️',
                rareza: 'Común',
                vidaPorTrozo: 1,
                superpoder: {
                    nombre: '💣 Disparo Doble',
                    descripcion: 'Ataca 2 casillas en línea (1x2)',
                    tipo: 'linea',
                    area: 2,
                    daño: 1
                }
            },
            { 
                nombre: 'Destructor', tamaño: 3, emoji: '🚢',
                rareza: 'Raro',
                vidaPorTrozo: 2,
                superpoder: {
                    nombre: '🌊 Torpedo Triple',
                    descripcion: 'Ataca 3 casillas en línea (1x3)',
                    tipo: 'linea',
                    area: 3,
                    daño: 1
                }
            },
            { 
                nombre: 'Crucero', tamaño: 4, emoji: '⛴️',
                rareza: 'Épico',
                vidaPorTrozo: 2,
                superpoder: {
                    nombre: '🎯 Bombardeo Cuadrado',
                    descripcion: 'Ataca área de 2x2',
                    tipo: 'area',
                    area: 2,
                    daño: 1
                }
            },
            { 
                nombre: 'Acorazado', tamaño: 5, emoji: '🛳️',
                rareza: 'Épico',
                vidaPorTrozo: 3,
                superpoder: {
                    nombre: '☄️ Misil Crucero',
                    descripcion: 'Ataca área de 3x3',
                    tipo: 'area',
                    area: 3,
                    daño: 1
                }
            },
            { 
                nombre: 'Portaaviones', tamaño: 6, emoji: '🚀',
                rareza: 'Mítico',
                vidaPorTrozo: 3,
                superpoder: {
                    nombre: '✈️ Ataque Aéreo',
                    descripcion: 'Ataca área de 4x4 y revela enemigos',
                    tipo: 'area',
                    area: 4,
                    revelar: true,
                    daño: 1
                }
            },
            { 
                nombre: 'Dreadnought', tamaño: 7, emoji: '⚓',
                rareza: 'Legendario',
                vidaPorTrozo: 4,
                superpoder: {
                    nombre: '💀 Aniquilación',
                    descripcion: 'Ataca área masiva de 5x5',
                    tipo: 'area',
                    area: 5,
                    daño: 2
                }
            }
        ];
        
        // Configuración de hechizos
        const hechizosConfig = [
            {
                id: 'rayo',
                nombre: '⚡ Rayo',
                rareza: 'Común',
                probabilidad: 0.15, // 15% al disparar agua
                descripcion: 'Daña un trozo y encadena al resto del barco',
                emoji: '⚡'
            },
            {
                id: 'rabia',
                nombre: '🔥 Rabia',
                rareza: 'Raro',
                probabilidad: 0.08,
                descripcion: 'Regenera vida de un trozo de tu barco (usa en tu tablero)',
                emoji: '🔥'
            },
            {
                id: 'terremoto',
                nombre: '🌋 Terremoto',
                rareza: 'Épico',
                probabilidad: 0.04,
                descripcion: 'Revela y daña área grande (más daño a distancia)',
                emoji: '🌋'
            },
            {
                id: 'revivir',
                nombre: '💚 Revivir',
                rareza: 'Mítico',
                probabilidad: 0.015,
                descripcion: 'Revive un barco aliado completo',
                emoji: '💚'
            },
            {
                id: 'atomica',
                nombre: '☢️ Bomba Atómica',
                rareza: 'Legendario',
                probabilidad: 0.005,
                descripcion: 'Destruye un barco enemigo entero',
                emoji: '☢️'
            }
        ];
        
        this.navalGame = {
            activo: true,
            turno: 'jugador',
            fase: 'colocacion',
            gridSize: GRID_SIZE,
            mapa: mapa,
            dificultadIA: nivelIA, // Guardar la dificultad de la IA
            
            // Sistema de energía (se llena con impactos)
            energiaJugador: 0,
            energiaMaxima: 7, // 7 impactos = energía llena
            energiaEnemigo: 0,
            superpoderActivo: null,
            
            // Hechizos recolectados
            hechizosJugador: [],
            hechizosEnemigo: [],
            hechizoActivo: null,
            
            jugador: {
                tablero: this.crearTableroVacio(GRID_SIZE),
                disparos: this.crearTableroVacio(GRID_SIZE),
                barcos: [],
                trozosImpactados: 0
            },
            
            enemigo: {
                tablero: this.crearTableroVacio(GRID_SIZE),
                disparos: this.crearTableroVacio(GRID_SIZE),
                barcos: [],
                trozosImpactados: 0
            },
            
            barcosConfig: barcosConfig,
            hechizosConfig: hechizosConfig,
            
            barcoActual: 0,
            orientacion: 'horizontal',
            mensaje: '',
            
            // Stats para recompensas
            disparosRealizados: 0,
            impactosLogrados: 0,
            
            // Efectos del mapa según rareza
            efectoMapa: this.generarEfectoMapa(mapa)
        };
        
        // Colocar barcos del enemigo automáticamente
        this.colocarBarcosIA();
        
        // Crear interfaz
        this.crearInterfazBatallaNaval();
        
        // Aplicar efecto del mapa
        if (this.navalGame.efectoMapa && this.navalGame.efectoMapa.aplicar) {
            this.navalGame.efectoMapa.aplicar(this.navalGame);
            if (this.navalGame.efectoMapa.id !== 'ninguno') {
                setTimeout(() => {
                    this.mostrarMensajeNaval(`${this.navalGame.efectoMapa.nombre}: ${this.navalGame.efectoMapa.desc}`, 3500);
                }, 500);
            }
        }
    }
    
    // Generar efecto aleatorio según la rareza del mapa
    this.generarEfectoMapa = function(mapa) {
        const efectos = {
            'Común': [
                { id: 'ninguno', nombre: '🌊 Mar Calmo', desc: 'Sin efectos especiales', aplicar: () => {} }
            ],
            'Raro': [
                { id: 'niebla', nombre: '🌫️ Niebla', desc: 'Visibilidad reducida: 30% de fallar', aplicar: (g) => { g.chanceNiebla = 0.3; } },
                { id: 'mareas', nombre: '🌊 Mareas Fuertes', desc: 'Disparos desviados ±1 casilla', aplicar: (g) => { g.mareas = true; } }
            ],
            'Épico': [
                { id: 'tormenta', nombre: '⛈️ Tormenta', desc: 'Rayos aleatorios cada 3 turnos', aplicar: (g) => { g.tormenta = true; g.turnosTormenta = 0; } },
                { id: 'remolino', nombre: '🌀 Remolino', desc: 'Centro del mapa gira barcos', aplicar: (g) => { g.remolino = true; } },
                { id: 'hechizoBonus', nombre: '✨ Mar Mágico', desc: '+10% prob. encontrar hechizos', aplicar: (g) => { g.bonusHechizo = 0.1; } }
            ],
            'Mítico': [
                { id: 'kraken', nombre: '🦑 Kraken', desc: 'Tentáculos atacan barcos cada 5 turnos', aplicar: (g) => { g.kraken = true; g.turnosKraken = 0; } },
                { id: 'fantasma', nombre: '👻 Barco Fantasma', desc: 'Un barco extra invisible al enemigo', aplicar: (g) => { g.fantasma = true; } }
            ],
            'Legendario': [
                { id: 'poseidon', nombre: '🔱 Favor de Poseidón', desc: 'Empiezas con 3 de energía', aplicar: (g) => { g.energiaJugador = 3; } },
                { id: 'volcan', nombre: '🌋 Volcán Submarino', desc: 'Explosiones aleatorias 2x2 cada 4 turnos', aplicar: (g) => { g.volcan = true; g.turnosVolcan = 0; } }
            ]
        };
        
        const rarezaEfectos = efectos[mapa.rareza] || efectos['Común'];
        const efecto = rarezaEfectos[Math.floor(Math.random() * rarezaEfectos.length)];
        
        return efecto;
    }
    
    this.crearTableroVacio = function(size) {
        return Array(size).fill(null).map(() => Array(size).fill(0));
    }
    
    this.colocarBarcosIA = function() {
        const game = this.navalGame;
        
        for (const config of game.barcosConfig) {
            let colocado = false;
            let intentos = 0;
            
            while (!colocado && intentos < 100) {
                const horizontal = Math.random() > 0.5;
                const x = Math.floor(Math.random() * (horizontal ? game.gridSize - config.tamaño : game.gridSize));
                const y = Math.floor(Math.random() * (horizontal ? game.gridSize : game.gridSize - config.tamaño));
                
                if (this.puedeColocarBarco(game.enemigo.tablero, x, y, config.tamaño, horizontal)) {
                    this.colocarBarcoEnTablero(game.enemigo, x, y, config.tamaño, horizontal, config);
                    colocado = true;
                }
                intentos++;
            }
        }
    }
    
    this.puedeColocarBarco = function(tablero, x, y, tamaño, horizontal) {
        for (let i = 0; i < tamaño; i++) {
            const cx = horizontal ? x + i : x;
            const cy = horizontal ? y : y + i;
            
            if (cx >= tablero.length || cy >= tablero.length) return false;
            if (tablero[cy][cx] !== 0) return false;
        }
        return true;
    }
    
    this.colocarBarcoEnTablero = function(jugador, x, y, tamaño, horizontal, config) {
        const vidaPorTrozo = config.vidaPorTrozo || 1;
        const barco = {
            ...config,
            casillas: [],
            hundido: false,
            vidaTotal: tamaño * vidaPorTrozo,
            vidaActual: tamaño * vidaPorTrozo,
            orientacion: horizontal ? 'horizontal' : 'vertical'
        };
        
        for (let i = 0; i < tamaño; i++) {
            const cx = horizontal ? x + i : x;
            const cy = horizontal ? y : y + i;
            jugador.tablero[cy][cx] = 1;
            // Cada casilla tiene su propia vida
            barco.casillas.push({ 
                x: cx, 
                y: cy, 
                tocado: false, 
                vida: vidaPorTrozo,
                vidaMax: vidaPorTrozo
            });
        }
        
        jugador.barcos.push(barco);
    }
    
    this.crearInterfazBatallaNaval = function() {
        const game = this.navalGame;
        const efecto = game.efectoMapa || { nombre: '🌊 Mar Calmo', desc: 'Sin efectos' };
        
        const html = `
            <div class="naval-container" id="navalGame">
                <div class="naval-header">
                    <div class="naval-title-row">
                        <button class="naval-exit-btn" onclick="cw.salirBatallaNaval()">← Salir</button>
                        <h2>🚢 BATALLA NAVAL - ${game.mapa.emoji} ${game.mapa.nombre}</h2>
                        <div class="naval-turno-badge" id="navalTurno">📍 Coloca tus barcos</div>
                    </div>
                    
                    <!-- Efecto del mapa y Barra de Energía -->
                    <div class="naval-info-row">
                        <div class="efecto-mapa-badge" title="${efecto.desc}">
                            ${efecto.nombre}
                        </div>
                        <div class="naval-energia-row" id="navalEnergia" style="display: none;">
                            <span class="energia-label">⚡ ENERGÍA</span>
                            <div class="energia-bar">
                                <div class="energia-fill" id="energiaFill" style="width: 0%"></div>
                            </div>
                            <span class="energia-text" id="energiaText">0/${game.energiaMaxima}</span>
                        </div>
                    </div>
                </div>
                
                <div class="naval-content">
                    <!-- Tablero del jugador -->
                    <div class="naval-board-section jugador">
                        <h3>🎯 TU FLOTA</h3>
                        <div class="naval-board" id="tableroJugador">
                            ${this.renderizarTableroNaval('jugador', true)}
                        </div>
                        <div class="barcos-status" id="barcosJugadorStatus"></div>
                    </div>
                    
                    <!-- Tablero enemigo -->
                    <div class="naval-board-section enemigo">
                        <h3>💥 FLOTA ENEMIGA</h3>
                        <div class="naval-board enemy" id="tableroEnemigo">
                            ${this.renderizarTableroNaval('enemigo', false)}
                        </div>
                        <div class="barcos-status" id="barcosEnemigoStatus"></div>
                    </div>
                </div>
                
                <!-- Panel inferior: Superpoderes y Hechizos -->
                <div class="naval-footer">
                    <div class="naval-colocacion-panel" id="navalColocacion">
                        <div class="colocacion-info">
                            <span class="colocando-label">Colocando:</span>
                            <span class="colocando-barco" id="barcoActualNombre">${game.barcosConfig[0].emoji} ${game.barcosConfig[0].nombre}</span>
                            <span class="colocando-size">(${game.barcosConfig[0].tamaño} casillas)</span>
                        </div>
                        <button class="btn-rotar-compact" onclick="cw.rotarBarcoNaval()">🔄 Rotar (<span id="orientacionActual">H</span>)</button>
                    </div>
                    
                    <div class="naval-poderes-panel" id="poderesPanel" style="display: none;">
                        <div class="superpoderes-section">
                            <span class="section-label">🚢 SUPERPODERES:</span>
                            <div class="superpoder-btns" id="superpoderBtns"></div>
                        </div>
                        <div class="hechizos-section">
                            <span class="section-label">✨ HECHIZOS:</span>
                            <div class="hechizos-btns" id="hechizosBtns"></div>
                        </div>
                    </div>
                </div>
                
                <div id="navalMensaje" class="naval-mensaje"></div>
            </div>
        `;
        
        $('body').append(html);
    }
    
    this.renderizarTableroNaval = function(quien, mostrarBarcos) {
        const game = this.navalGame;
        const jugador = game[quien];
        let html = '';
        
        for (let y = 0; y < game.gridSize; y++) {
            for (let x = 0; x < game.gridSize; x++) {
                const celda = jugador.tablero[y][x];
                let clase = 'naval-cell';
                let contenido = '';
                let estiloExtra = '';
                
                if (quien === 'jugador') {
                    // Mostrar barcos del jugador con colores según vida
                    if (celda === 1 && mostrarBarcos) {
                        const barco = this.getBarcoEnPosicion(game.jugador.barcos, x, y);
                        const casilla = barco?.casillas.find(c => c.x === x && c.y === y);
                        
                        if (casilla) {
                            // Determinar tipo de barco para estilo
                            const tipoBarco = barco?.nombre?.toLowerCase().replace(/\s/g, '') || 'barco';
                            
                            // Determinar posición en el barco (proa, medio, popa)
                            const idx = barco?.casillas.findIndex(c => c.x === x && c.y === y);
                            const esHorizontal = barco?.orientacion === 'horizontal';
                            let posicionClase = '';
                            if (idx === 0) {
                                posicionClase = esHorizontal ? 'proa' : 'proa-v';
                            } else if (idx === barco?.casillas.length - 1) {
                                posicionClase = esHorizontal ? 'popa' : 'popa-v';
                            } else if (!esHorizontal) {
                                // Trozo intermedio vertical
                                posicionClase = 'vertical';
                            }
                            
                            // Si el barco está hundido completamente
                            if (barco?.hundido) {
                                clase = 'naval-cell hundido';
                                contenido = '☠️';
                                estiloExtra = 'background: linear-gradient(145deg, #1a1a2e, #0d0d1a) !important;';
                            } else if (casilla.vida <= 0) {
                                // Trozo destruido (negro con explosión)
                                clase += ' destruido';
                                contenido = '💥';
                                estiloExtra = 'background: linear-gradient(145deg, #2a2a2a, #1a1a1a) !important; border: 2px solid #ff4444;';
                            } else if (casilla.vida < casilla.vidaMax) {
                                // Trozo dañado - color según vida restante (4 niveles)
                                const porcentajeVida = casilla.vida / casilla.vidaMax;
                                clase += ` barco ${tipoBarco} ${posicionClase} dañado`;
                                
                                if (porcentajeVida <= 0.25) {
                                    // Crítico - rojo oscuro
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(180,20,20,0.95), rgba(100,10,10,0.95)) !important; border: 2px solid #ff0000;';
                                    contenido = '🔥';
                                } else if (porcentajeVida <= 0.5) {
                                    // Muy dañado - rojo
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(255,50,50,0.9), rgba(200,30,30,0.9)) !important; border: 2px solid #ff3333;';
                                    contenido = '🔥';
                                } else if (porcentajeVida <= 0.75) {
                                    // Dañado - naranja
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(255,165,0,0.85), rgba(220,130,0,0.9)) !important; border: 2px solid #ff9900;';
                                    contenido = barco?.emoji || '🚢';
                                } else {
                                    // Tocado - amarillo
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(255,255,0,0.75), rgba(220,220,0,0.85)) !important; border: 2px solid #ffff00;';
                                    contenido = barco?.emoji || '🚢';
                                }
                            } else {
                                // Trozo sano
                                clase += ` barco ${tipoBarco} ${posicionClase}`;
                                contenido = barco?.emoji || '🚢';
                            }
                        }
                    }
                    
                    // Disparos del enemigo en agua
                    const disparo = game.enemigo.disparos[y]?.[x];
                    if (disparo === 1 && celda === 0) {
                        clase += ' agua disparada';
                        contenido = '💦';
                    }
                } else {
                    // Tablero enemigo - mostrar nuestros disparos
                    const miDisparo = game.jugador.disparos[y][x];
                    if (miDisparo === 1) {
                        const barcoE = this.getBarcoEnPosicion(game.enemigo.barcos, x, y);
                        const casillaE = barcoE?.casillas.find(c => c.x === x && c.y === y);
                        
                        if (celda === 1 && casillaE) {
                            if (barcoE?.hundido) {
                                // Barco completamente hundido
                                clase = 'naval-cell hundido';
                                contenido = '☠️';
                                estiloExtra = 'background: linear-gradient(145deg, #1a1a2e, #0d0d1a);';
                            } else if (casillaE.vida <= 0) {
                                // Trozo destruido (negro con explosión)
                                clase += ' destruido';
                                contenido = '💥';
                                estiloExtra = 'background: linear-gradient(145deg, #2a2a2a, #1a1a1a); border: 2px solid #ff4444;';
                            } else {
                                // Impactado pero no destruido - progresión de colores
                                clase += ' tocado';
                                const porcentajeVida = casillaE.vida / casillaE.vidaMax;
                                
                                // Progresión: Amarillo → Naranja → Rojo → Rojo oscuro
                                if (porcentajeVida <= 0.25) {
                                    // Crítico - rojo oscuro casi negro
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(180,20,20,0.95), rgba(100,10,10,0.95)); border: 2px solid #ff0000;';
                                    contenido = '🔥';
                                } else if (porcentajeVida <= 0.5) {
                                    // Muy dañado - rojo
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(255,50,50,0.9), rgba(200,30,30,0.9)); border: 2px solid #ff3333;';
                                    contenido = '🔥';
                                } else if (porcentajeVida <= 0.75) {
                                    // Dañado - naranja
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(255,165,0,0.85), rgba(220,130,0,0.9)); border: 2px solid #ff9900;';
                                    contenido = '🔥';
                                } else {
                                    // Tocado - amarillo
                                    estiloExtra = 'background: linear-gradient(145deg, rgba(255,255,0,0.75), rgba(220,220,0,0.85)); border: 2px solid #ffff00;';
                                    contenido = '💫';
                                }
                            }
                        } else {
                            clase += ' agua disparada';
                            contenido = '💦';
                        }
                    }
                }
                
                const onclick = game.fase === 'colocacion' && quien === 'jugador' 
                    ? `onclick="cw.colocarBarcoNaval(${x}, ${y})"`
                    : game.fase === 'batalla' && quien === 'enemigo' && game.turno === 'jugador'
                    ? `onclick="cw.dispararNaval(${x}, ${y})"`
                    : game.fase === 'batalla' && quien === 'jugador' && game.hechizoActivo && (game.hechizoActivo.hechizo.id === 'rabia')
                    ? `onclick="cw.ejecutarHechizoPropio(${x}, ${y})"`
                    : '';
                
                const style = estiloExtra ? `style="${estiloExtra}"` : '';
                html += `<div class="${clase}" data-x="${x}" data-y="${y}" ${style} ${onclick}>${contenido}</div>`;
            }
        }
        
        return html;
    }
    
    this.getBarcoEnPosicion = function(barcos, x, y) {
        for (const barco of barcos) {
            if (barco.casillas.some(c => c.x === x && c.y === y)) {
                return barco;
            }
        }
        return null;
    }
    
    this.actualizarTablerosNaval = function() {
        const game = this.navalGame;
        if (!game) return;
        
        $('#tableroJugador').html(this.renderizarTableroNaval('jugador', true));
        $('#tableroEnemigo').html(this.renderizarTableroNaval('enemigo', false));
        
        if (game.fase === 'batalla') {
            this.actualizarStatusBarcos();
            this.actualizarHechizosUI();
        }
    }
    
    this.rotarBarcoNaval = function() {
        const game = this.navalGame;
        game.orientacion = game.orientacion === 'horizontal' ? 'vertical' : 'horizontal';
        $('#orientacionActual').text(game.orientacion === 'horizontal' ? 'H' : 'V');
    }
    
    this.colocarBarcoNaval = function(x, y) {
        const game = this.navalGame;
        if (game.fase !== 'colocacion') return;
        
        const config = game.barcosConfig[game.barcoActual];
        const horizontal = game.orientacion === 'horizontal';
        
        if (this.puedeColocarBarco(game.jugador.tablero, x, y, config.tamaño, horizontal)) {
            this.colocarBarcoEnTablero(game.jugador, x, y, config.tamaño, horizontal, config);
            
            game.barcoActual++;
            
            if (game.esMultijugador) {
                // Multijugador: actualizar UI y esperar a que termine de colocar
                if (game.barcoActual >= game.barcosConfig.length) {
                    // Todos colocados
                    this.actualizarInfoColocacionMulti();
                } else {
                    this.actualizarInfoColocacionMulti();
                }
                this.actualizarTablerosNaval();
            } else {
                // IA: cambiar a batalla cuando todos están colocados
                if (game.barcoActual >= game.barcosConfig.length) {
                    // Todos los barcos colocados
                    game.fase = 'batalla';
                    $('#navalColocacion').hide();
                    $('#poderesPanel').show();
                    $('#navalEnergia').show();
                    this.actualizarBarraEnergia();
                    this.actualizarStatusBarcos();
                    $('#navalTurno').text('🎯 ¡Tu turno! Dispara a la flota enemiga');
                } else {
                    const siguiente = game.barcosConfig[game.barcoActual];
                    $('#barcoActualNombre').text(`${siguiente.emoji} ${siguiente.nombre}`);
                    $('.colocando-size').text(`(${siguiente.tamaño} casillas)`);
                }
                
                this.actualizarTablerosNaval();
            }
        } else {
            this.mostrarMensajeNaval('❌ No puedes colocar el barco ahí');
        }
    }
    
    this.mostrarMensajeNaval = function(texto, duracion = 2000) {
        $('#navalMensaje').text(texto).addClass('visible');
        setTimeout(() => $('#navalMensaje').removeClass('visible'), duracion);
    }
    
    // ==========================================
    // SISTEMA DE DISPARO Y TURNOS
    // ==========================================
    
    this.dispararNaval = function(x, y) {
        const game = this.navalGame;
        if (game.fase !== 'batalla' || game.turno !== 'jugador') return;
        
        // Si hay hechizo activo, usar hechizo
        if (game.hechizoActivo) {
            this.ejecutarHechizo(x, y);
            return;
        }
        
        // Si hay superpoder activo, usar superpoder
        if (game.superpoderActivo) {
            this.ejecutarSuperPoder(x, y);
            return;
        }
        
        // Disparo normal - verificar si ya se disparó completamente
        const barcoEnPos = this.getBarcoEnPosicion(game.enemigo.barcos, x, y);
        const casillaEnPos = barcoEnPos?.casillas.find(c => c.x === x && c.y === y);
        
        // Si ya disparamos y la casilla está destruida o es agua ya disparada
        if (game.jugador.disparos[y][x] !== 0 && (!casillaEnPos || casillaEnPos.vida <= 0)) {
            this.mostrarMensajeNaval('❌ Ya disparaste ahí');
            return;
        }
        
        // EFECTO DE MAPA: Niebla - chance de fallar
        if (game.chanceNiebla && Math.random() < game.chanceNiebla) {
            game.jugador.disparos[y][x] = 1;
            this.animarDisparo(x, y, 'miss');
            this.mostrarMensajeNaval('🌫️ ¡La niebla te hizo fallar!', 1500);
            setTimeout(() => {
                this.actualizarTablerosNaval();
                this.pasarTurnoEnemigo();
            }, 800);
            return;
        }
        
        // EFECTO DE MAPA: Mareas - desplazar disparo ±1
        let targetX = x, targetY = y;
        if (game.mareas && Math.random() < 0.5) {
            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = Math.floor(Math.random() * 3) - 1;
            targetX = Math.max(0, Math.min(game.gridSize - 1, x + dx));
            targetY = Math.max(0, Math.min(game.gridSize - 1, y + dy));
            if (targetX !== x || targetY !== y) {
                this.mostrarMensajeNaval('🌊 ¡Las mareas desviaron tu disparo!', 1500);
            }
        }
        
        game.jugador.disparos[targetY][targetX] = 1;
        game.disparosRealizados++;
        
        const impacto = game.enemigo.tablero[targetY][targetX] === 1;
        
        if (impacto) {
            game.impactosLogrados++;
            
            // Buscar el barco y la casilla impactada
            let barcoHundido = null;
            let casillaDestruida = false;
            
            for (const barco of game.enemigo.barcos) {
                for (const casilla of barco.casillas) {
                    if (casilla.x === targetX && casilla.y === targetY) {
                        // Reducir vida de la casilla
                        casilla.vida--;
                        casilla.tocado = true;
                        barco.vidaActual--;
                        game.enemigo.trozosImpactados++;
                        
                        if (casilla.vida <= 0) {
                            casillaDestruida = true;
                        }
                        
                        // Aumentar energía solo si destruimos completamente un trozo
                        if (casilla.vida <= 0) {
                            game.energiaJugador = Math.min(game.energiaJugador + 1, game.energiaMaxima);
                            this.actualizarBarraEnergia();
                        }
                    }
                }
                
                // Verificar si el barco está hundido (todas las casillas sin vida)
                const todoDestruido = barco.casillas.every(c => c.vida <= 0);
                if (todoDestruido && !barco.hundido) {
                    barco.hundido = true;
                    barcoHundido = barco;
                }
            }
            
            // Animación según el resultado
            if (barcoHundido) {
                this.animarDisparo(targetX, targetY, 'sink', barcoHundido);
                this.mostrarMensajeNaval(`🎉 ¡Hundiste el ${barcoHundido.nombre}!`, 2500);
            } else if (casillaDestruida) {
                this.animarDisparo(targetX, targetY, 'destroy');
                this.mostrarMensajeNaval('💥 ¡Trozo destruido!', 1200);
            } else {
                this.animarDisparo(targetX, targetY, 'hit');
                this.mostrarMensajeNaval('🔥 ¡Impacto! Sigue dañado...', 1000);
            }
            
            // Verificar victoria
            if (game.enemigo.barcos.every(b => b.hundido)) {
                setTimeout(() => {
                    this.actualizarTablerosNaval();
                    this.finalizarBatallaNaval(true);
                }, 1500);
                return;
            }
        } else {
            // Disparo al agua - chance de encontrar hechizo
            this.animarDisparo(targetX, targetY, 'water');
            this.intentarEncontrarHechizo();
            this.mostrarMensajeNaval('💦 Agua', 800);
        }
        
        // Delay para que se vean las animaciones antes de actualizar
        setTimeout(() => {
            this.actualizarTablerosNaval();
            this.pasarTurnoEnemigo();
        }, 1000);
    }
    
    // Sistema de animaciones navales
    this.animarDisparo = function(x, y, tipo, barco = null) {
        const $celda = $(`#tableroEnemigo .naval-cell[data-x="${x}"][data-y="${y}"]`);
        
        // Crear elemento de animación
        const $anim = $('<div class="naval-anim"></div>');
        
        switch(tipo) {
            case 'water':
                $anim.addClass('anim-water').html('💦');
                break;
            case 'hit':
                $anim.addClass('anim-hit').html('🔥');
                break;
            case 'destroy':
                $anim.addClass('anim-destroy').html('💥');
                break;
            case 'sink':
                $anim.addClass('anim-sink').html('☠️');
                // Animar todas las casillas del barco
                if (barco) {
                    barco.casillas.forEach(c => {
                        const $bc = $(`#tableroEnemigo .naval-cell[data-x="${c.x}"][data-y="${c.y}"]`);
                        $bc.addClass('sinking');
                    });
                }
                break;
            case 'miss':
                $anim.addClass('anim-miss').html('🌫️');
                break;
        }
        
        $celda.append($anim);
        
        // Remover animación después
        setTimeout(() => {
            $anim.remove();
            $celda.removeClass('sinking');
        }, 900);
    }
    
    // Animar en tablero del jugador (cuando enemigo dispara o para efectos propios)
    this.animarDisparoEnemigo = function(x, y, tipo) {
        const $celda = $(`#tableroJugador .naval-cell[data-x="${x}"][data-y="${y}"]`);
        
        const $anim = $('<div class="naval-anim"></div>');
        
        switch(tipo) {
            case 'water':
                $anim.addClass('anim-water').html('💦');
                break;
            case 'hit':
                $anim.addClass('anim-hit').html('🔥');
                break;
            case 'destroy':
                $anim.addClass('anim-destroy').html('💥');
                break;
            case 'sink':
                $anim.addClass('anim-sink').html('☠️');
                break;
            case 'heal':
                $anim.addClass('anim-heal').html('💚');
                break;
        }
        
        $celda.append($anim);
        setTimeout(() => $anim.remove(), 900);
    }
    
    this.pasarTurnoEnemigo = function() {
        const game = this.navalGame;
        game.turno = 'enemigo';
        $('#navalTurno').text('🤖 Turno enemigo...');
        $('#tableroEnemigo').addClass('disabled');
        
        // Aplicar efectos de mapa por turno
        this.aplicarEfectosMapa();
        
        setTimeout(() => this.turnoIANaval(), 1200);
    }
    
    // Efectos de mapa que ocurren cada X turnos
    this.aplicarEfectosMapa = function() {
        const game = this.navalGame;
        if (!game) return;
        
        // TORMENTA: Rayos aleatorios cada 3 turnos
        if (game.tormenta) {
            game.turnosTormenta = (game.turnosTormenta || 0) + 1;
            if (game.turnosTormenta >= 3) {
                game.turnosTormenta = 0;
                const x = Math.floor(Math.random() * game.gridSize);
                const y = Math.floor(Math.random() * game.gridSize);
                // 50% al jugador, 50% al enemigo
                if (Math.random() < 0.5) {
                    this.aplicarDañoBarco(game.jugador.barcos, x, y);
                    this.mostrarMensajeNaval(`⚡ ¡Un rayo cayó en tu flota!`, 2000);
                } else {
                    this.aplicarDañoBarco(game.enemigo.barcos, x, y);
                    game.jugador.disparos[y][x] = 1;
                    this.mostrarMensajeNaval(`⚡ ¡Un rayo cayó en la flota enemiga!`, 2000);
                }
                this.actualizarTablerosNaval();
            }
        }
        
        // VOLCÁN: Explosión 2x2 aleatoria cada 4 turnos
        if (game.volcan) {
            game.turnosVolcan = (game.turnosVolcan || 0) + 1;
            if (game.turnosVolcan >= 4) {
                game.turnosVolcan = 0;
                const cx = Math.floor(Math.random() * (game.gridSize - 1));
                const cy = Math.floor(Math.random() * (game.gridSize - 1));
                // Afecta a ambos jugadores en esa zona
                for (let dy = 0; dy <= 1; dy++) {
                    for (let dx = 0; dx <= 1; dx++) {
                        this.aplicarDañoBarco(game.jugador.barcos, cx + dx, cy + dy);
                        this.aplicarDañoBarco(game.enemigo.barcos, cx + dx, cy + dy);
                        game.jugador.disparos[cy + dy][cx + dx] = 1;
                    }
                }
                this.mostrarMensajeNaval(`🌋 ¡Erupción volcánica en zona ${cx},${cy}!`, 2500);
                this.actualizarTablerosNaval();
            }
        }
        
        // KRAKEN: Ataca un barco aleatorio cada 5 turnos
        if (game.kraken) {
            game.turnosKraken = (game.turnosKraken || 0) + 1;
            if (game.turnosKraken >= 5) {
                game.turnosKraken = 0;
                const objetivo = Math.random() < 0.5 ? game.jugador : game.enemigo;
                const barcosVivos = objetivo.barcos.filter(b => !b.hundido);
                if (barcosVivos.length > 0) {
                    const barco = barcosVivos[Math.floor(Math.random() * barcosVivos.length)];
                    const casilla = barco.casillas.find(c => !c.tocado);
                    if (casilla) {
                        casilla.tocado = true;
                        barco.vidaActual--;
                        if (barco.vidaActual <= 0) barco.hundido = true;
                        const quien = objetivo === game.jugador ? 'tu' : 'un barco enemigo';
                        this.mostrarMensajeNaval(`🦑 ¡El Kraken atacó ${quien}!`, 2500);
                        this.actualizarTablerosNaval();
                    }
                }
            }
        }
    }
    
    // Aplicar daño a un barco en una posición
    this.aplicarDañoBarco = function(barcos, x, y) {
        for (const barco of barcos) {
            const casilla = barco.casillas.find(c => c.x === x && c.y === y);
            if (casilla && casilla.vida > 0) {
                casilla.vida--;
                casilla.tocado = true;
                barco.vidaActual--;
                if (casilla.vida <= 0) {
                    // Trozo destruido completamente
                }
                if (barco.vidaActual <= 0) barco.hundido = true;
                return true;
            }
        }
        return false;
    }
    
    // ==========================================
    // SISTEMA DE ENERGÍA Y SUPERPODERES
    // ==========================================
    
    this.actualizarBarraEnergia = function() {
        const game = this.navalGame;
        const porcentaje = (game.energiaJugador / game.energiaMaxima) * 100;
        
        $('#energiaFill').css('width', porcentaje + '%');
        $('#energiaText').text(`${game.energiaJugador}/${game.energiaMaxima}`);
        
        // Cambiar color según nivel
        const fill = $('#energiaFill');
        fill.removeClass('energia-low energia-mid energia-high energia-full');
        
        if (porcentaje >= 100) {
            fill.addClass('energia-full');
        } else if (porcentaje >= 60) {
            fill.addClass('energia-high');
        } else if (porcentaje >= 30) {
            fill.addClass('energia-mid');
        } else {
            fill.addClass('energia-low');
        }
        
        // Actualizar botones de definitivas según energía actual
        this.actualizarBotonesDefinitivas();
    }
    
    // NUEVO SISTEMA: Cada punto de energía desbloquea la definitiva del barco correspondiente
    // 1 energía = Lancha, 2 = Patrullero, 3 = Destructor, 4 = Crucero, 5 = Acorazado, 6 = Portaaviones, 7 = Dreadnought
    this.actualizarBotonesDefinitivas = function() {
        const game = this.navalGame;
        const energia = game.energiaJugador;
        const barcosVivos = game.jugador.barcos.filter(b => !b.hundido);
        
        // Orden de barcos por tamaño (menor a mayor) - coincide con barcosConfig
        const ordenBarcos = ['Lancha', 'Patrullero', 'Destructor', 'Crucero', 'Acorazado', 'Portaaviones', 'Dreadnought'];
        
        let html = '<div class="definitivas-grid">';
        
        ordenBarcos.forEach((nombreBarco, index) => {
            const barco = barcosVivos.find(b => b.nombre === nombreBarco);
            const energiaRequerida = index + 1; // 1, 2, 3, 4, 5, 6, 7
            const desbloqueado = energia >= energiaRequerida && barco;
            const hundido = !barco;
            
            let clase = 'definitiva-slot';
            let estado = '';
            
            if (hundido) {
                clase += ' hundido';
                estado = '💀';
            } else if (desbloqueado) {
                clase += ' desbloqueado pulse';
                estado = '✓';
            } else {
                clase += ' bloqueado';
                estado = `${energiaRequerida}⚡`;
            }
            
            const barcoInfo = game.barcosConfig.find(b => b.nombre === nombreBarco);
            const emoji = barcoInfo ? barcoInfo.emoji : '🚢';
            const superpoder = barcoInfo ? barcoInfo.superpoder : null;
            
            html += `
                <div class="${clase}" 
                     onclick="${desbloqueado ? `cw.usarDefinitivaBarco('${nombreBarco}')` : ''}"
                     title="${superpoder ? superpoder.nombre + ': ' + superpoder.descripcion : nombreBarco}">
                    <span class="slot-emoji">${emoji}</span>
                    <span class="slot-estado">${estado}</span>
                    ${superpoder ? `<span class="slot-nombre">${superpoder.nombre.split(' ')[0]}</span>` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        $('#superpoderBtns').html(html);
    }
    
    // Usar definitiva de un barco específico
    this.usarDefinitivaBarco = function(nombreBarco) {
        const game = this.navalGame;
        if (game.turno !== 'jugador') {
            this.mostrarMensajeNaval('❌ ¡No es tu turno!', 2000);
            return;
        }
        
        const ordenBarcos = ['Lancha', 'Patrullero', 'Destructor', 'Crucero', 'Acorazado', 'Portaaviones', 'Dreadnought'];
        const indice = ordenBarcos.indexOf(nombreBarco);
        const energiaRequerida = indice + 1;
        
        if (game.energiaJugador < energiaRequerida) {
            this.mostrarMensajeNaval(`❌ Necesitas ${energiaRequerida} de energía`, 2000);
            return;
        }
        
        const barco = game.jugador.barcos.find(b => b.nombre === nombreBarco && !b.hundido);
        if (!barco) {
            this.mostrarMensajeNaval('❌ Ese barco está hundido', 2000);
            return;
        }
        
        // Activar modo superpoder
        game.superpoderActivo = {
            barco: barco,
            config: barco.superpoder,
            coste: energiaRequerida
        };
        
        $('#navalTurno').html(`💥 <strong>${barco.superpoder.nombre}</strong> - ¡Elige objetivo en el tablero enemigo!`);
        $('#tableroEnemigo').addClass('superpoder-mode');
        this.mostrarMensajeNaval(`🎯 ${barco.superpoder.nombre}: ${barco.superpoder.descripcion}`, 3000);
    }

    this.seleccionarSuperPoder = function(nombreBarco) {
        const game = this.navalGame;
        if (game.energiaJugador < game.energiaMaxima || game.turno !== 'jugador') return;
        
        const barco = game.jugador.barcos.find(b => b.nombre === nombreBarco && !b.hundido);
        if (!barco) return;
        
        game.superpoderActivo = {
            barco: barco,
            config: barco.superpoder
        };
        
        $('#navalTurno').text(`💥 ${barco.superpoder.nombre} - Elige objetivo`);
        $('#tableroEnemigo').addClass('superpoder-mode');
        this.mostrarMensajeNaval(`Usando ${barco.superpoder.nombre}: ${barco.superpoder.descripcion}`, 3000);
    }
    
    this.ejecutarSuperPoder = function(x, y) {
        const game = this.navalGame;
        if (!game.superpoderActivo) return;
        
        const sp = game.superpoderActivo;
        const casillasAfectadas = [];
        
        // Determinar casillas según tipo de superpoder
        if (sp.config.tipo === 'linea') {
            // Línea horizontal de tamaño especificado
            const halfSize = Math.floor(sp.config.area / 2);
            for (let i = -halfSize; i <= halfSize; i++) {
                const nx = x + i;
                if (nx >= 0 && nx < game.gridSize) {
                    casillasAfectadas.push({ x: nx, y: y });
                }
            }
        } else if (sp.config.tipo === 'area') {
            // Área cuadrada NxN
            const radio = Math.floor(sp.config.area / 2);
            for (let dy = -radio; dy <= radio; dy++) {
                for (let dx = -radio; dx <= radio; dx++) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && nx < game.gridSize && ny >= 0 && ny < game.gridSize) {
                        casillasAfectadas.push({ x: nx, y: ny });
                    }
                }
            }
        }
        
        // Aplicar daño con sistema de vida gradual
        let impactos = 0;
        let destruidos = 0;
        const daño = sp.config.daño || 1;
        
        casillasAfectadas.forEach(pos => {
            game.jugador.disparos[pos.y][pos.x] = 1;
            
            if (game.enemigo.tablero[pos.y][pos.x] === 1) {
                for (const barco of game.enemigo.barcos) {
                    for (const c of barco.casillas) {
                        if (c.x === pos.x && c.y === pos.y && c.vida > 0) {
                            c.vida -= daño;
                            c.tocado = true;
                            barco.vidaActual -= daño;
                            impactos++;
                            
                            if (c.vida <= 0) {
                                destruidos++;
                                // Aumentar energía del jugador
                                game.energiaJugador = Math.min(game.energiaJugador + 1, game.energiaMaxima);
                            }
                        }
                    }
                    // Verificar si barco hundido
                    const todoDestruido = barco.casillas.every(c => c.vida <= 0);
                    if (todoDestruido && !barco.hundido) {
                        barco.hundido = true;
                        this.mostrarMensajeNaval(`🎉 ¡Hundiste el ${barco.nombre}!`, 2500);
                    }
                }
            }
        });
        
        // Revelar si el superpoder lo permite
        if (sp.config.revelar) {
            this.revelarZona(x, y, sp.config.area);
        }
        
        // Consumir energía
        const coste = sp.coste || game.energiaMaxima;
        game.energiaJugador = Math.max(0, game.energiaJugador - coste);
        game.superpoderActivo = null;
        
        this.actualizarBarraEnergia();
        $('#tableroEnemigo').removeClass('superpoder-mode');
        
        this.mostrarMensajeNaval(`💥 ¡${sp.config.nombre}! ${impactos} impactos, ${destruidos} trozos destruidos`);
        
        this.actualizarTablerosNaval();
        
        // Victoria?
        if (game.enemigo.barcos.every(b => b.hundido)) {
            setTimeout(() => this.finalizarBatallaNaval(true), 500);
            return;
        }
        
        this.pasarTurnoEnemigo();
    }
    
    this.revelarZona = function(cx, cy, size) {
        const game = this.navalGame;
        const radio = Math.floor(size / 2);
        
        for (let dy = -radio; dy <= radio; dy++) {
            for (let dx = -radio; dx <= radio; dx++) {
                const x = cx + dx, y = cy + dy;
                if (x >= 0 && x < game.gridSize && y >= 0 && y < game.gridSize) {
                    if (game.enemigo.tablero[y][x] === 1) {
                        $(`.naval-board.enemy .naval-cell[data-x="${x}"][data-y="${y}"]`).addClass('revelado');
                    }
                }
            }
        }
    }
    
    // ==========================================
    // SISTEMA DE HECHIZOS
    // ==========================================
    
    this.intentarEncontrarHechizo = function() {
        const game = this.navalGame;
        const bonusHechizo = game.bonusHechizo || 0; // Efecto mapa mágico
        
        for (const hechizo of game.hechizosConfig) {
            const probAjustada = hechizo.probabilidad + bonusHechizo;
            if (Math.random() < probAjustada) {
                game.hechizosJugador.push({ ...hechizo });
                this.mostrarMensajeNaval(`✨ ¡Encontraste ${hechizo.nombre}!`, 2500);
                this.actualizarHechizosUI();
                break; // Solo un hechizo por disparo
            }
        }
    }
    
    this.actualizarHechizosUI = function() {
        const game = this.navalGame;
        if (!game) return;
        
        let html = '';
        game.hechizosJugador.forEach((h, idx) => {
            html += `
                <button class="hechizo-btn rareza-${h.rareza.toLowerCase()}" 
                    onclick="cw.seleccionarHechizo(${idx})" 
                    title="${h.descripcion}">
                    ${h.emoji}
                </button>
            `;
        });
        
        if (game.hechizosJugador.length === 0) {
            html = '<span class="no-hechizos">Ninguno</span>';
        }
        
        $('#hechizosBtns').html(html);
    }
    
    this.seleccionarHechizo = function(idx) {
        const game = this.navalGame;
        if (game.turno !== 'jugador') return;
        
        const hechizo = game.hechizosJugador[idx];
        if (!hechizo) return;
        
        // Rabia y Revivir se usan en tablero propio
        if (hechizo.id === 'revivir') {
            this.usarHechizoRevivir(idx);
            return;
        }
        
        if (hechizo.id === 'rabia') {
            game.hechizoActivo = { hechizo, idx };
            $('#navalTurno').text('🔥 Rabia - Elige un trozo de TU barco para curar');
            $('#tableroJugador').addClass('hechizo-mode');
            this.mostrarMensajeNaval('Selecciona un trozo dañado de tu barco', 3000);
            return;
        }
        
        game.hechizoActivo = { hechizo, idx };
        $('#navalTurno').text(`✨ ${hechizo.nombre} - Elige objetivo`);
        $('#tableroEnemigo').addClass('hechizo-mode');
        this.mostrarMensajeNaval(hechizo.descripcion, 3000);
    }
    
    this.ejecutarHechizo = function(x, y) {
        const game = this.navalGame;
        if (!game.hechizoActivo) return;
        
        const { hechizo, idx } = game.hechizoActivo;
        let consumeTurno = true; // Por defecto consume turno
        
        switch (hechizo.id) {
            case 'rayo':
                this.usarHechizoRayo(x, y);
                break;
            case 'terremoto':
                this.usarHechizoTerremoto(x, y);
                break;
            case 'atomica':
                this.usarHechizoAtomica(x, y);
                break;
        }
        
        // Consumir hechizo
        game.hechizosJugador.splice(idx, 1);
        game.hechizoActivo = null;
        $('#tableroEnemigo').removeClass('hechizo-mode');
        
        this.actualizarHechizosUI();
        this.actualizarTablerosNaval();
        
        // Victoria?
        if (game.enemigo.barcos.every(b => b.hundido)) {
            setTimeout(() => this.finalizarBatallaNaval(true), 500);
            return;
        }
        
        // Solo pasar turno si el hechizo lo requiere
        if (consumeTurno) {
            this.pasarTurnoEnemigo();
        } else {
            $('#navalTurno').text('🎯 ¡Tu turno!');
        }
    }
    
    // Nueva función para hechizos que se usan en el tablero propio
    this.ejecutarHechizoPropio = function(x, y) {
        const game = this.navalGame;
        if (!game.hechizoActivo) return;
        
        const { hechizo, idx } = game.hechizoActivo;
        let exito = false;
        
        switch (hechizo.id) {
            case 'rabia':
                exito = this.usarHechizoRabia(x, y);
                break;
        }
        
        if (!exito) return; // Si falló, no consumir el hechizo
        
        // Consumir hechizo
        game.hechizosJugador.splice(idx, 1);
        game.hechizoActivo = null;
        $('#tableroJugador').removeClass('hechizo-mode');
        
        this.actualizarHechizosUI();
        this.actualizarTablerosNaval();
        
        // Rabia no consume turno
        $('#navalTurno').text('🎯 ¡Tu turno!');
    }
    
    this.usarHechizoRayo = function(x, y) {
        const game = this.navalGame;
        game.jugador.disparos[y][x] = 1;
        
        if (game.enemigo.tablero[y][x] === 1) {
            // Encontrar el barco y dañar en cadena
            const barco = this.getBarcoEnPosicion(game.enemigo.barcos, x, y);
            if (barco) {
                let daño = 3; // Daño inicial alto
                barco.casillas.forEach((c, i) => {
                    if (!c.tocado && daño > 0) {
                        c.tocado = true;
                        c.vida = 0;
                        barco.vidaActual--;
                        game.jugador.disparos[c.y][c.x] = 1;
                        daño--; // Reducir daño cada concatenación
                    }
                });
                
                if (barco.vidaActual <= 0) barco.hundido = true;
                this.mostrarMensajeNaval('⚡ ¡Rayo encadenado!');
            }
        } else {
            this.mostrarMensajeNaval('⚡ El rayo cayó al agua');
        }
    }
    
    this.usarHechizoRabia = function(x, y) {
        const game = this.navalGame;
        
        // Buscar si hay un barco propio en esa posición
        const barco = this.getBarcoEnPosicion(game.jugador.barcos, x, y);
        if (!barco) {
            this.mostrarMensajeNaval('❌ No hay barco ahí', 2000);
            return false;
        }
        
        // Encontrar la casilla
        const casilla = barco.casillas.find(c => c.x === x && c.y === y);
        if (!casilla) {
            this.mostrarMensajeNaval('❌ Casilla no encontrada', 2000);
            return false;
        }
        
        // Verificar que esté dañada pero no destruida
        if (casilla.vida >= casilla.vidaMax) {
            this.mostrarMensajeNaval('❌ Ese trozo está intacto', 2000);
            return false;
        }
        
        if (casilla.vida <= 0) {
            this.mostrarMensajeNaval('❌ Ese trozo está destruido, usa Revivir', 2000);
            return false;
        }
        
        // Regenerar vida
        const vidaAntes = casilla.vida;
        casilla.vida = casilla.vidaMax;
        barco.vidaActual += (casilla.vidaMax - vidaAntes);
        casilla.tocado = false;
        
        this.animarDisparoEnemigo(x, y, 'heal');
        this.mostrarMensajeNaval(`🔥 ¡RABIA! Trozo regenerado (+${casilla.vidaMax - vidaAntes} vida)`, 2500);
        return true;
    }
    
    this.usarHechizoTerremoto = function(x, y) {
        const game = this.navalGame;
        const radio = 4; // Gran área
        let impactos = 0;
        
        for (let dy = -radio; dy <= radio; dy++) {
            for (let dx = -radio; dx <= radio; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < game.gridSize && ny >= 0 && ny < game.gridSize) {
                    const distancia = Math.abs(dx) + Math.abs(dy);
                    const dañoExtra = Math.floor(distancia / 2); // Más daño a distancia
                    
                    game.jugador.disparos[ny][nx] = 1;
                    
                    if (game.enemigo.tablero[ny][nx] === 1) {
                        impactos++;
                        const barco = this.getBarcoEnPosicion(game.enemigo.barcos, nx, ny);
                        if (barco) {
                            const casilla = barco.casillas.find(c => c.x === nx && c.y === ny);
                            if (casilla && !casilla.tocado) {
                                casilla.tocado = true;
                                barco.vidaActual -= (1 + dañoExtra);
                                if (barco.vidaActual <= 0) barco.hundido = true;
                            }
                        }
                    }
                }
            }
        }
        
        this.mostrarMensajeNaval(`🌋 ¡TERREMOTO! Revelada zona, ${impactos} impactos`);
    }
    
    this.usarHechizoRevivir = function(idx) {
        const game = this.navalGame;
        const barcosHundidos = game.jugador.barcos.filter(b => b.hundido);
        
        if (barcosHundidos.length === 0) {
            this.mostrarMensajeNaval('❌ No tienes barcos hundidos');
            return;
        }
        
        // Revivir el primero hundido
        const barco = barcosHundidos[0];
        barco.hundido = false;
        barco.vidaActual = barco.vidaTotal;
        barco.casillas.forEach(c => {
            c.tocado = false;
            c.vida = 1;
        });
        
        game.hechizosJugador.splice(idx, 1);
        game.hechizoActivo = null;
        
        this.mostrarMensajeNaval(`💚 ¡${barco.nombre} revivido!`);
        this.actualizarHechizosUI();
        this.actualizarTablerosNaval();
    }
    
    this.usarHechizoAtomica = function(x, y) {
        const game = this.navalGame;
        game.jugador.disparos[y][x] = 1;
        
        const barco = this.getBarcoEnPosicion(game.enemigo.barcos, x, y);
        if (barco && !barco.hundido) {
            // Destruir barco entero
            barco.casillas.forEach(c => {
                c.tocado = true;
                c.vida = 0;
                game.jugador.disparos[c.y][c.x] = 1;
            });
            barco.vidaActual = 0;
            barco.hundido = true;
            
            this.mostrarMensajeNaval(`☢️ ¡BOMBA ATÓMICA! ${barco.nombre} destruido`, 3000);
        } else {
            this.mostrarMensajeNaval('☢️ La bomba cayó al agua');
        }
    }
    
    // ==========================================
    // IA DEL ENEMIGO
    // ==========================================
    
    this.turnoIANaval = function() {
        const game = this.navalGame;
        if (!game || game.turno !== 'enemigo') return;
        
        const dificultad = game.dificultadIA || 'normal';
        let x, y;
        let encontrado = false;
        
        // Configuración de IA según dificultad
        const configIA = {
            facil: { probAcierto: 0.2, usaAdyacentes: false, persigue: false },
            normal: { probAcierto: 0.35, usaAdyacentes: true, persigue: true },
            dificil: { probAcierto: 0.5, usaAdyacentes: true, persigue: true },
            experto: { probAcierto: 0.8, usaAdyacentes: true, persigue: true }
        };
        
        const config = configIA[dificultad] || configIA.normal;
        
        // IA EXPERTO: tiene probabilidad de "saber" dónde hay barcos
        if (dificultad === 'experto' && Math.random() < config.probAcierto) {
            // Buscar un barco no hundido para atacar
            for (const barco of game.jugador.barcos) {
                if (!barco.hundido) {
                    const casillaViva = barco.casillas.find(c => c.vida > 0);
                    if (casillaViva) {
                        x = casillaViva.x;
                        y = casillaViva.y;
                        encontrado = true;
                        break;
                    }
                }
            }
        }
        
        // IA persigue barcos dañados (si está habilitado)
        if (!encontrado && config.persigue) {
            for (let py = 0; py < game.gridSize && !encontrado; py++) {
                for (let px = 0; px < game.gridSize && !encontrado; px++) {
                    if (game.enemigo.disparos[py][px] === 1 && game.jugador.tablero[py][px] === 1) {
                        const barco = this.getBarcoEnPosicion(game.jugador.barcos, px, py);
                        if (barco && !barco.hundido) {
                            // Primero intentar seguir golpeando la misma casilla si tiene vida
                            const casillaActual = barco.casillas.find(c => c.x === px && c.y === py);
                            if (casillaActual && casillaActual.vida > 0) {
                                x = px;
                                y = py;
                                encontrado = true;
                                break;
                            }
                            
                            // Si usa adyacentes, buscar alrededor
                            if (config.usaAdyacentes) {
                                const adyacentes = [
                                    { x: px - 1, y: py }, { x: px + 1, y: py },
                                    { x: px, y: py - 1 }, { x: px, y: py + 1 }
                                ];
                                for (const adj of adyacentes) {
                                    if (adj.x >= 0 && adj.x < game.gridSize && 
                                        adj.y >= 0 && adj.y < game.gridSize) {
                                        const casillaAdj = barco.casillas.find(c => c.x === adj.x && c.y === adj.y);
                                        if (casillaAdj && casillaAdj.vida > 0) {
                                            x = adj.x;
                                            y = adj.y;
                                            encontrado = true;
                                            break;
                                        } else if (game.enemigo.disparos[adj.y][adj.x] === 0) {
                                            x = adj.x;
                                            y = adj.y;
                                            encontrado = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // IA DIFICIL: a veces acierta en casillas nuevas
        if (!encontrado && (dificultad === 'dificil' || dificultad === 'normal') && Math.random() < config.probAcierto) {
            for (const barco of game.jugador.barcos) {
                if (!barco.hundido) {
                    const casillaNoDisparada = barco.casillas.find(c => game.enemigo.disparos[c.y][c.x] === 0);
                    if (casillaNoDisparada) {
                        x = casillaNoDisparada.x;
                        y = casillaNoDisparada.y;
                        encontrado = true;
                        break;
                    }
                }
            }
        }
        
        // Si no hay adyacentes, disparo aleatorio
        if (!encontrado) {
            let intentos = 0;
            do {
                x = Math.floor(Math.random() * game.gridSize);
                y = Math.floor(Math.random() * game.gridSize);
                intentos++;
                
                // Evitar disparar a casillas ya destruidas
                const barcoEnPos = this.getBarcoEnPosicion(game.jugador.barcos, x, y);
                const casillaEnPos = barcoEnPos?.casillas.find(c => c.x === x && c.y === y);
                if (game.enemigo.disparos[y][x] !== 0 && (!casillaEnPos || casillaEnPos.vida <= 0)) {
                    continue;
                }
                if (game.enemigo.disparos[y][x] === 0 || (casillaEnPos && casillaEnPos.vida > 0)) {
                    break;
                }
            } while (intentos < 100);
        }
        
        game.enemigo.disparos[y][x] = 1;
        
        const impacto = game.jugador.tablero[y][x] === 1;
        
        if (impacto) {
            let barcoHundido = null;
            let casillaDestruida = false;
            
            for (const barco of game.jugador.barcos) {
                for (const casilla of barco.casillas) {
                    if (casilla.x === x && casilla.y === y && casilla.vida > 0) {
                        casilla.vida--;
                        casilla.tocado = true;
                        barco.vidaActual--;
                        
                        if (casilla.vida <= 0) {
                            casillaDestruida = true;
                            game.energiaEnemigo = Math.min(game.energiaEnemigo + 1, game.energiaMaxima);
                        }
                    }
                }
                
                const todoDestruido = barco.casillas.every(c => c.vida <= 0);
                if (todoDestruido && !barco.hundido) {
                    barco.hundido = true;
                    barcoHundido = barco;
                }
            }
            
            // Animación
            if (barcoHundido) {
                this.animarDisparoEnemigo(x, y, 'sink');
                this.mostrarMensajeNaval(`💀 ¡Hundieron tu ${barcoHundido.nombre}!`, 2500);
            } else if (casillaDestruida) {
                this.animarDisparoEnemigo(x, y, 'destroy');
            } else {
                this.animarDisparoEnemigo(x, y, 'hit');
            }
            
            // Derrota?
            if (game.jugador.barcos.every(b => b.hundido)) {
                setTimeout(() => {
                    this.actualizarTablerosNaval();
                    this.finalizarBatallaNaval(false);
                }, 1500);
                return;
            }
        } else {
            this.animarDisparoEnemigo(x, y, 'water');
        }
        
        // Delay para animaciones
        setTimeout(() => {
            // Volver turno al jugador ANTES de actualizar tableros
            game.turno = 'jugador';
            $('#navalTurno').text('🎯 ¡Tu turno!');
            $('#tableroEnemigo').removeClass('disabled');
            
            // Actualizar tableros DESPUÉS de cambiar el turno
            this.actualizarTablerosNaval();
        }, 1000);
    }
    
    // ==========================================
    // STATUS Y UI
    // ==========================================
    
    this.actualizarStatusBarcos = function() {
        const game = this.navalGame;
        if (!game) return;
        
        // Barcos jugador
        let htmlJ = '<div class="barcos-lista">';
        game.jugador.barcos.forEach(barco => {
            const clase = barco.hundido ? 'hundido' : 'activo';
            htmlJ += `<span class="barco-status ${clase}" title="${barco.nombre}">${barco.emoji}</span>`;
        });
        htmlJ += '</div>';
        $('#barcosJugadorStatus').html(htmlJ);
        
        // Barcos enemigo
        let htmlE = '<div class="barcos-lista">';
        game.enemigo.barcos.forEach(barco => {
            const clase = barco.hundido ? 'hundido' : 'desconocido';
            htmlE += `<span class="barco-status ${clase}">${barco.hundido ? barco.emoji : '❓'}</span>`;
        });
        htmlE += '</div>';
        $('#barcosEnemigoStatus').html(htmlE);
    }
    
    this.finalizarBatallaNaval = function(victoria) {
        const game = this.navalGame;
        game.activo = false;
        
        const barcosHundidosE = game.enemigo.barcos.filter(b => b.hundido).length;
        const barcosHundidosJ = game.jugador.barcos.filter(b => b.hundido).length;
        
        // Calcular recompensas
        let oro = 0, xp = 0, copas = 0;
        
        if (victoria) {
            oro = 100 + (barcosHundidosE * 20) - (game.disparosRealizados * 0.5);
            xp = 50 + (barcosHundidosE * 10);
            copas = 25 + Math.floor(barcosHundidosE * 5);
            
            // Bonus por precisión
            const precision = game.impactosLogrados / Math.max(game.disparosRealizados, 1);
            if (precision > 0.5) {
                oro += 50;
                xp += 25;
            }
        } else {
            oro = 20 + (barcosHundidosE * 5);
            xp = 15 + (barcosHundidosE * 3);
            copas = -10;
        }
        
        oro = Math.max(Math.floor(oro), 0);
        xp = Math.floor(xp);
        
        // Aplicar recompensas
        this.datosJugador.monedas += oro;
        this.datosJugador.xp = (this.datosJugador.xp || 0) + xp;
        this.datosJugador.copas = Math.max((this.datosJugador.copas || 0) + copas, 0);
        
        if (victoria) {
            this.datosJugador.victorias = (this.datosJugador.victorias || 0) + 1;
        } else {
            this.datosJugador.derrotas = (this.datosJugador.derrotas || 0) + 1;
        }
        
        // Verificar si sube de nivel
        this.verificarSubidaNivel();
        
        // Guardar y actualizar UI
        this.guardarProgreso();
        this.actualizarPerfilStats();
        this.actualizarMonedas();
        
        const html = `
            <div class="game-end-overlay naval">
                <div class="game-end-content ${victoria ? 'victoria' : 'derrota'}">
                    <h1>${victoria ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}</h1>
                    <div class="end-stats">
                        <p>🚢 Barcos enemigos hundidos: ${barcosHundidosE}/${game.barcosConfig.length}</p>
                        <p>💔 Tus barcos perdidos: ${barcosHundidosJ}/${game.barcosConfig.length}</p>
                        <p>🎯 Precisión: ${Math.round((game.impactosLogrados / Math.max(game.disparosRealizados, 1)) * 100)}%</p>
                    </div>
                    <div class="end-rewards">
                        <span class="reward gold">💰 +${oro}</span>
                        <span class="reward xp">⭐ +${xp} XP</span>
                        <span class="reward copas ${copas >= 0 ? 'positive' : 'negative'}">🏆 ${copas >= 0 ? '+' : ''}${copas}</span>
                    </div>
                    <div class="end-buttons">
                        <button class="btn-end-play" onclick="cw.reiniciarBatallaNaval()">🔄 Jugar de Nuevo</button>
                        <button class="btn-end-menu" onclick="cw.salirBatallaNaval()">🏠 Menú</button>
                    </div>
                </div>
            </div>
        `;
        
        $('#navalGame').append(html);
    }
    
    this.reiniciarBatallaNaval = function() {
        const tropaId = this.shooterSeleccion.tropa;
        const mapaId = this.shooterSeleccion.mapa;
        this.salirBatallaNaval();
        this.iniciarBatallaNaval(tropaId, mapaId);
    }
    
    this.salirBatallaNaval = function() {
        $('#navalGame').remove();
        
        $('.game-container').show();
        $('#googleSigninContainer').show();
        $('#rankingPanel').show();
        $('#profileIcon').show();
        
        this.navalGame = null;
        this.mostrarPanelShooterDominio('mar');
    }

    // ==========================================
    // MOTOR DEL SHOOTER 1v1 (LEGACY)
    // ==========================================
    
    this.iniciarJuegoShooter = function(dominio, tropaId, mapaId, modo) {
        const tropa = this.unidadesAtaque[dominio].tropas.find(t => t.id === tropaId);
        const mapa = this.mapasShooter[dominio].find(m => m.id === mapaId);
        
        if (!tropa || !mapa) {
            this.mostrarMensaje('❌ Error: Tropa o mapa no encontrado');
            return;
        }
        
        // Inicializar estado del juego shooter
        this.shooterGame = {
            activo: true,
            dominio: dominio,
            modo: modo, // 'ia' o 'multi'
            mapa: mapa,
            tiempoInicio: Date.now(),
            tiempoLimite: 300000, // 5 minutos
            
            // ========== SISTEMA DE TURNOS (TANK STARS STYLE) ==========
            turno: 'jugador', // 'jugador' o 'enemigo'
            fase: 'movimiento', // 'movimiento', 'apuntar', 'disparando', 'esperando', 'cambioTurno'
            turnoNumero: 1,
            tiempoTurno: 30000, // 30 segundos por turno
            inicioTurno: Date.now(),
            
            // Sistema de movimiento por turno
            movimientoRestante: 150, // Píxeles que puede moverse por turno
            movimientoMax: 150,
            
            // Controles de disparo
            angulo: 45, // Ángulo en grados (0-90)
            potencia: 50, // Potencia del disparo (10-100)
            anguloMin: 5,
            anguloMax: 85,
            potenciaMin: 10,
            potenciaMax: 100,
            
            // Viento (afecta trayectoria)
            viento: (Math.random() - 0.5) * 4, // -2 a +2
            
            // Calcular posición Y correcta (suelo)
            sueloY: mapa.config.alto - 50,
            
            // Jugador
            jugador: {
                tropa: tropa,
                x: mapa.config.spawnPoints[0].x,
                y: mapa.config.alto - 50, // Sobre el suelo
                vida: tropa.stats.vida,
                vidaMax: tropa.stats.vida,
                direccion: 1, // Siempre mira a la derecha
                armaActual: 0,
                escudo: 0, // Escudo temporal
                tipoVisual: this.getTipoVisual(tropa), // 'soldado', 'francotirador', 'tanque'
                stats: {
                    disparos: 0,
                    impactos: 0,
                    dañoHecho: 0,
                    dañoRecibido: 0
                }
            },
            
            // Enemigo (IA o jugador)
            enemigo: {
                tropa: this.getEnemigoAleatorio(dominio, modo),
                x: mapa.config.spawnPoints[1].x,
                y: mapa.config.alto - 50, // Sobre el suelo
                vida: 100,
                vidaMax: 100,
                direccion: -1, // Siempre mira a la izquierda
                armaActual: 0,
                escudo: 0,
                tipoVisual: null, // Se asigna después
                // IA para calcular disparo
                iaAngulo: 45,
                iaPotencia: 50
            },
            
            // Proyectil activo (solo 1 a la vez en este modo)
            proyectilActivo: null,
            
            // Explosiones y efectos
            efectos: [],
            explosiones: [],
            
            // Canvas y contexto
            canvas: null,
            ctx: null,
            animationFrame: null
        };
        
        // Configurar vida del enemigo según su tropa
        const enemigoTropa = this.shooterGame.enemigo.tropa;
        this.shooterGame.enemigo.vida = enemigoTropa.stats.vida;
        this.shooterGame.enemigo.vidaMax = enemigoTropa.stats.vida;
        this.shooterGame.enemigo.tipoVisual = this.getTipoVisual(enemigoTropa);
        
        // Crear la interfaz del juego
        this.crearInterfazShooter();
        
        // Iniciar los controles
        this.iniciarControlesShooter();
        
        // Iniciar el game loop
        this.gameLoopShooter();
    }
    
    // Determinar tipo visual según la tropa
    this.getTipoVisual = function(tropa) {
        if (!tropa) return 'soldado';
        const id = tropa.id.toLowerCase();
        if (id.includes('tanque')) return 'tanque';
        if (id.includes('lancero') || id.includes('franco')) return 'francotirador';
        return 'soldado';
    }
    
    this.getEnemigoAleatorio = function(dominio, modo) {
        const tropas = this.unidadesAtaque[dominio].tropas;
        // Para IA, elegir una tropa aleatoria
        const disponibles = tropas.filter(t => t.desbloqueado || Math.random() > 0.5);
        return disponibles[Math.floor(Math.random() * disponibles.length)] || tropas[0];
    }
    
    this.crearInterfazShooter = function() {
        const game = this.shooterGame;
        const mapa = game.mapa;
        const jugador = game.jugador;
        const enemigo = game.enemigo;
        
        // LIMPIAR TODO ANTES
        this.limpiar();
        $('#shooterArena').remove();
        
        // Ocultar todos los elementos de la UI principal
        $('.game-container').hide();
        $('#googleSigninContainer').hide();
        $('#rankingPanel').hide();
        $('#profileIcon').hide();
        
        const html = `
            <div class="shooter-arena-container tank-stars-mode" id="shooterArena">
                <!-- HUD Superior - Estilo Tank Stars -->
                <div class="tank-hud-top">
                    <!-- Panel Jugador -->
                    <div class="tank-player-panel player">
                        <div class="tank-avatar">${jugador.tropa.emoji}</div>
                        <div class="tank-info">
                            <div class="tank-name">${jugador.tropa.nombre}</div>
                            <div class="tank-health-bar">
                                <div class="tank-health-fill" id="hudVidaJugador" style="width: 100%"></div>
                                <span class="tank-health-text" id="hudVidaTexto">${jugador.vida}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Centro - Turno e Info -->
                    <div class="tank-center-panel">
                        <div class="tank-turn-indicator" id="turnIndicator">
                            <span class="turn-text">🎯 TU TURNO</span>
                        </div>
                        <div class="tank-wind-indicator" id="windIndicator">
                            <span class="wind-label">💨 Viento:</span>
                            <span class="wind-value" id="windValue">→ 0</span>
                        </div>
                        <div class="tank-round-info">
                            <span>Ronda <span id="roundNumber">1</span></span>
                        </div>
                    </div>
                    
                    <!-- Panel Enemigo -->
                    <div class="tank-player-panel enemy">
                        <div class="tank-info">
                            <div class="tank-name">${enemigo.tropa.nombre}</div>
                            <div class="tank-health-bar">
                                <div class="tank-health-fill enemy" id="hudVidaEnemigo" style="width: 100%"></div>
                                <span class="tank-health-text" id="hudVidaEnemigoTexto">${enemigo.vida}</span>
                            </div>
                        </div>
                        <div class="tank-avatar enemy">${enemigo.tropa.emoji}</div>
                    </div>
                </div>
                
                <!-- Canvas del juego -->
                <div class="shooter-canvas-container" id="canvasContainer">
                    <canvas id="shooterCanvas" width="${mapa.config.ancho || 1200}" height="${mapa.config.alto || 700}"></canvas>
                </div>
                
                <!-- Panel de Control Inferior - Solo visible en tu turno -->
                <div class="tank-controls-panel" id="controlsPanel">
                    <!-- Indicador de Fase -->
                    <div class="phase-indicator" id="phaseIndicator">
                        🚶 <b>MOVIMIENTO</b> - Usa A/D o ←→ para moverte, ESPACIO para apuntar
                    </div>
                    
                    <!-- Controles de MOVIMIENTO (Fase 1) -->
                    <div class="tank-move-controls" id="moveControls">
                        <div class="move-info">
                            <div class="control-label">🚶 MOVIMIENTO</div>
                            <div class="move-bar-container">
                                <div class="move-bar">
                                    <div class="move-fill" id="moveFill" style="width: 100%"></div>
                                </div>
                                <span class="move-value" id="moveValue">150px</span>
                            </div>
                        </div>
                        
                        <div class="move-buttons">
                            <button class="move-btn" onmousedown="cw.moverJugador(-10)" ontouchstart="cw.moverJugador(-10)">
                                ◀ Izquierda
                            </button>
                            <button class="move-btn" onmousedown="cw.moverJugador(10)" ontouchstart="cw.moverJugador(10)">
                                Derecha ▶
                            </button>
                        </div>
                        
                        <button class="btn-ready-aim" id="btnReadyAim" onclick="cw.pasarAFaseApuntar()">
                            🎯 ¡LISTO PARA APUNTAR!
                        </button>
                    </div>
                    
                    <!-- Controles de APUNTAR (Fase 2) - Inicialmente ocultos -->
                    <div class="tank-aim-controls hidden" id="aimControls">
                        <!-- Selector de Arma -->
                        <div class="tank-weapon-selector">
                            <div class="weapon-label">⚔️ ARMA</div>
                            <div class="tank-weapons" id="tankWeapons">
                                ${jugador.tropa.armas.map((arma, i) => `
                                    <div class="tank-weapon-btn ${i === 0 ? 'active' : ''}" data-arma="${i}" onclick="cw.cambiarArmaShooter(${i})">
                                        <span class="weapon-emoji">${arma.emoji}</span>
                                        <span class="weapon-name">${arma.nombre}</span>
                                        <span class="weapon-dmg">💥 ${arma.daño}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Control de Ángulo -->
                        <div class="tank-angle-control">
                            <div class="control-label">📐 ÁNGULO</div>
                            <div class="angle-display">
                                <button class="angle-btn" onclick="cw.ajustarAngulo(-5)">◀</button>
                                <span class="angle-value" id="angleValue">45°</span>
                                <button class="angle-btn" onclick="cw.ajustarAngulo(5)">▶</button>
                            </div>
                            <input type="range" class="angle-slider" id="angleSlider" min="5" max="85" value="45" 
                                   oninput="cw.setAngulo(this.value)">
                        </div>
                        
                        <!-- Control de Potencia -->
                        <div class="tank-power-control">
                            <div class="control-label">💪 POTENCIA</div>
                            <div class="power-bar-container">
                                <div class="power-bar" id="powerBar">
                                    <div class="power-fill" id="powerFill" style="width: 50%"></div>
                                </div>
                                <span class="power-value" id="powerValue">50%</span>
                            </div>
                            <input type="range" class="power-slider" id="powerSlider" min="10" max="100" value="50"
                                   oninput="cw.setPotencia(this.value)">
                        </div>
                        
                        <!-- Botón de Disparo -->
                        <div class="tank-fire-section">
                            <button class="tank-fire-btn" id="fireBtn" onclick="cw.dispararTurno()">
                                <span class="fire-icon">🎯</span>
                                <span class="fire-text">¡FUEGO!</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Timer del turno -->
                    <div class="turn-timer-section">
                        <div class="turn-timer">
                            <span id="turnTimer">30</span>s
                        </div>
                    </div>
                </div>
                
                <!-- Indicador de controles -->
                <div class="tank-controls-hints">
                    <div class="tank-hint" id="hintMove"><span class="key">A/D</span> <span class="action">Mover</span></div>
                    <div class="tank-hint" id="hintAngle"><span class="key">↑↓</span> <span class="action">Ángulo</span></div>
                    <div class="tank-hint" id="hintPower"><span class="key">←→</span> <span class="action">Potencia</span></div>
                    <div class="tank-hint"><span class="key">ESPACIO</span> <span class="action">Confirmar</span></div>
                    <div class="tank-hint"><span class="key">1-9</span> <span class="action">Arma</span></div>
                </div>
                
                <!-- Botón de salir -->
                <button class="shooter-exit-btn" onclick="cw.salirShooter()">✕ Salir</button>
            </div>
        `;
        
        $("body").append(html);
        
        // Configurar canvas
        const canvas = document.getElementById('shooterCanvas');
        const ctx = canvas.getContext('2d');
        
        game.canvas = canvas;
        game.ctx = ctx;
        
        // Actualizar indicador de viento
        this.actualizarViento();
        
        console.log("🎮 Tank Stars Mode iniciado");
        console.log("Jugador:", jugador.x, jugador.y);
        console.log("Enemigo:", enemigo.x, enemigo.y);
    }
    
    // ========== CONTROLES TANK STARS ==========
    this.ajustarAngulo = function(delta) {
        const game = this.shooterGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.angulo = Math.max(game.anguloMin, Math.min(game.anguloMax, game.angulo + delta));
        $('#angleValue').text(game.angulo + '°');
        $('#angleSlider').val(game.angulo);
    }
    
    this.setAngulo = function(valor) {
        const game = this.shooterGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.angulo = parseInt(valor);
        $('#angleValue').text(game.angulo + '°');
    }
    
    this.setPotencia = function(valor) {
        const game = this.shooterGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.potencia = parseInt(valor);
        $('#powerValue').text(game.potencia + '%');
        $('#powerFill').css('width', game.potencia + '%');
    }
    
    this.actualizarViento = function() {
        const game = this.shooterGame;
        const viento = game.viento;
        let texto = '';
        let flecha = '';
        
        if (Math.abs(viento) < 0.5) {
            texto = 'Calma';
            flecha = '—';
        } else if (viento > 0) {
            flecha = '→'.repeat(Math.min(3, Math.ceil(Math.abs(viento))));
            texto = flecha + ' ' + Math.abs(viento).toFixed(1);
        } else {
            flecha = '←'.repeat(Math.min(3, Math.ceil(Math.abs(viento))));
            texto = flecha + ' ' + Math.abs(viento).toFixed(1);
        }
        
        $('#windValue').text(texto);
    }
    
    this.iniciarControlesShooter = function() {
        const game = this.shooterGame;
        
        // Teclas para controles rápidos
        $(document).on('keydown.shooter', (e) => {
            const key = e.key.toLowerCase();
            
            // Fase de MOVIMIENTO - mover personaje con A/D o flechas
            if (game.turno === 'jugador' && game.fase === 'movimiento') {
                const velocidad = 5;
                
                if (key === 'arrowleft' || key === 'a') {
                    this.moverJugador(-velocidad);
                    e.preventDefault();
                }
                if (key === 'arrowright' || key === 'd') {
                    this.moverJugador(velocidad);
                    e.preventDefault();
                }
                
                // Enter o Espacio para pasar a fase de apuntar
                if (key === ' ' || key === 'enter') {
                    this.pasarAFaseApuntar();
                    e.preventDefault();
                }
            }
            
            // Fase de APUNTAR - controles de ángulo y potencia
            if (game.turno === 'jugador' && game.fase === 'apuntar') {
                // Ajustar ángulo con flechas arriba/abajo o W/S
                if (key === 'arrowup' || key === 'w') {
                    this.ajustarAngulo(2);
                    e.preventDefault();
                }
                if (key === 'arrowdown' || key === 's') {
                    this.ajustarAngulo(-2);
                    e.preventDefault();
                }
                
                // Ajustar potencia con flechas izq/der o A/D
                if (key === 'arrowleft' || key === 'a') {
                    this.setPotencia(Math.max(10, game.potencia - 3));
                    $('#powerSlider').val(game.potencia);
                    e.preventDefault();
                }
                if (key === 'arrowright' || key === 'd') {
                    this.setPotencia(Math.min(100, game.potencia + 3));
                    $('#powerSlider').val(game.potencia);
                    e.preventDefault();
                }
                
                // Disparar con espacio o enter
                if (key === ' ' || key === 'enter') {
                    this.dispararTurno();
                    e.preventDefault();
                }
                
                // Cambiar arma con 1-9
                if (key >= '1' && key <= '9') {
                    const idx = parseInt(key) - 1;
                    if (idx < game.jugador.tropa.armas.length) {
                        this.cambiarArmaShooter(idx);
                    }
                }
            }
            
            // Escape para pausar
            if (key === 'escape') {
                this.mostrarMenuPausaShooter();
            }
        });
        
        $(document).on('keyup.shooter', (e) => {
            // No necesitamos keyup en modo Tank Stars
        });
        
        // Prevenir menú contextual
        $('#shooterCanvas').on('contextmenu', (e) => e.preventDefault());
    }
    
    // ========== SISTEMA DE MOVIMIENTO POR TURNO ==========
    this.moverJugador = function(delta) {
        const game = this.shooterGame;
        if (game.turno !== 'jugador' || game.fase !== 'movimiento') return;
        if (game.movimientoRestante <= 0) return;
        
        const movReal = Math.min(Math.abs(delta), game.movimientoRestante);
        const direccion = delta > 0 ? 1 : -1;
        
        // Calcular nueva posición
        const nuevaX = game.jugador.x + (movReal * direccion);
        
        // Límites del mapa
        const limiteIzq = 50;
        const limiteDer = game.mapa.config.ancho - 50;
        
        // No permitir pasar del centro (acercarse demasiado al enemigo)
        const centroMapa = game.mapa.config.ancho / 2;
        const limiteAcercarse = centroMapa - 100;
        
        // Aplicar límites
        game.jugador.x = Math.max(limiteIzq, Math.min(limiteAcercarse, nuevaX));
        
        // Descontar movimiento usado
        game.movimientoRestante -= movReal;
        
        // Actualizar barra de movimiento
        this.actualizarBarraMovimiento();
    }
    
    this.actualizarBarraMovimiento = function() {
        const game = this.shooterGame;
        const pct = (game.movimientoRestante / game.movimientoMax) * 100;
        $('#moveFill').css('width', pct + '%');
        $('#moveValue').text(Math.round(game.movimientoRestante) + 'px');
    }
    
    this.pasarAFaseApuntar = function() {
        const game = this.shooterGame;
        if (game.turno !== 'jugador' || game.fase !== 'movimiento') return;
        
        game.fase = 'apuntar';
        
        // Mostrar controles de apuntar, ocultar movimiento
        $('#moveControls').addClass('hidden');
        $('#aimControls').removeClass('hidden');
        $('#fireBtn').prop('disabled', false).removeClass('disabled');
        
        // Actualizar instrucciones
        $('#phaseIndicator').html('🎯 <b>APUNTAR</b> - Ajusta ángulo y potencia');
    }
    
    // ========== SISTEMA DE DISPARO POR TURNOS ==========
    this.dispararTurno = function() {
        const game = this.shooterGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.fase = 'disparando';
        $('#fireBtn').prop('disabled', true).addClass('disabled');
        $('#controlsPanel').addClass('firing');
        
        const jugador = game.jugador;
        const arma = jugador.tropa.armas[jugador.armaActual];
        
        // Convertir ángulo a radianes (el jugador dispara hacia la derecha y arriba)
        // En canvas Y crece hacia abajo, así que para disparar hacia arriba usamos ángulo negativo
        const anguloRad = (game.angulo * Math.PI) / 180;
        const velocidadBase = game.potencia * 0.15; // Escalar potencia a velocidad
        
        // Determinar tipo visual y posición del proyectil según tipo de tropa
        const tipoVisual = jugador.tipoVisual || 'soldado';
        let startX, startY;
        
        if (tipoVisual === 'tanque') {
            const cañonLargo = 60;
            // Para el jugador: dispara hacia la derecha (+cos) y arriba (-sin)
            startX = jugador.x + Math.cos(anguloRad) * cañonLargo;
            startY = jugador.y - 55 - Math.sin(anguloRad) * cañonLargo;
        } else {
            const armaLargo = 45;
            startX = jugador.x + Math.cos(anguloRad) * armaLargo;
            startY = jugador.y - 55 - Math.sin(anguloRad) * armaLargo;
        }
        
        // Determinar estilo de proyectil según tipo de arma
        const proyectilVisual = this.getProyectilVisual(arma);
        
        // Crear proyectil con física parabólica
        // vx positivo = hacia la derecha, vy negativo = hacia arriba
        game.proyectilActivo = {
            x: startX,
            y: startY,
            vx: Math.cos(anguloRad) * velocidadBase,
            vy: -Math.sin(anguloRad) * velocidadBase,
            gravedad: 0.15,
            viento: game.viento * 0.02,
            daño: arma.daño,
            radio: arma.radioExplosion || 40,
            color: proyectilVisual.color,
            tipo: proyectilVisual.tipo,
            tamaño: proyectilVisual.tamaño,
            trail: [],
            propietario: 'jugador',
            arma: arma
        };
        
        jugador.stats.disparos++;
        
        // En multijugador, enviar el disparo al rival
        if (game.modo === 'multi' && ws) {
            ws.enviarDisparoTurno(game.angulo, game.potencia, jugador.armaActual, jugador.x);
        }
        
        console.log(`🎯 Disparo! Ángulo: ${game.angulo}°, Potencia: ${game.potencia}%`);
    }
    
    // Determinar visual del proyectil según tipo de arma
    this.getProyectilVisual = function(arma) {
        const tipo = arma.tipo ? arma.tipo.toLowerCase() : 'bala';
        
        switch(tipo) {
            case 'cañon':
            case 'cañón':
            case 'explosive':
                return { tipo: 'cannonball', color: '#333', tamaño: 16 };
            case 'cohete':
            case 'misil':
            case 'rocket':
                return { tipo: 'rocket', color: '#FF4500', tamaño: 20 };
            case 'arco':
            case 'flecha':
            case 'arrow':
                return { tipo: 'arrow', color: '#8B4513', tamaño: 25 };
            case 'sniper':
            case 'franco':
            case 'precision':
                return { tipo: 'sniper', color: '#FFD700', tamaño: 8 };
            case 'escopeta':
            case 'shotgun':
                return { tipo: 'shotgun', color: '#FFA500', tamaño: 6 };
            default:
                return { tipo: 'bullet', color: '#FFD700', tamaño: 8 };
        }
    }
    
    this.dispararIA = function() {
        const game = this.shooterGame;
        const enemigo = game.enemigo;
        const jugador = game.jugador;
        const arma = enemigo.tropa.armas[enemigo.armaActual];
        
        // Obtener configuración de dificultad
        const dificultad = game.dificultad || 'normal';
        const configDificultad = {
            facil: { errorAngulo: 35, errorPotencia: 30, baseAngulo: 25 },
            normal: { errorAngulo: 20, errorPotencia: 20, baseAngulo: 30 },
            dificil: { errorAngulo: 10, errorPotencia: 10, baseAngulo: 35 },
            imposible: { errorAngulo: 3, errorPotencia: 5, baseAngulo: 38 }
        };
        const config = configDificultad[dificultad] || configDificultad.normal;
        
        // Calcular distancia y dirección al jugador
        const dx = jugador.x - enemigo.x;
        const dy = enemigo.y - jugador.y; // Invertido porque Y crece hacia abajo
        const distancia = Math.sqrt(dx * dx + dy * dy);
        
        // Calcular ángulo óptimo para trayectoria parabólica
        // Fórmula: El ángulo depende de la distancia - más distancia = más ángulo
        let anguloOptimo = config.baseAngulo + (distancia * 0.025);
        
        // Ajustar por altura relativa (si el jugador está más alto, aumentar ángulo)
        if (dy > 0) {
            anguloOptimo += dy * 0.05;
        }
        
        // Ajustar por viento
        anguloOptimo -= game.viento * 5;
        
        // Limitar ángulo a rangos válidos
        anguloOptimo = Math.max(25, Math.min(70, anguloOptimo));
        
        // Potencia óptima basada en distancia
        let potenciaOptima = 45 + (distancia * 0.06);
        potenciaOptima = Math.max(40, Math.min(90, potenciaOptima));
        
        // Aplicar error según dificultad
        const errorAng = (Math.random() - 0.5) * config.errorAngulo;
        const errorPot = (Math.random() - 0.5) * config.errorPotencia;
        
        enemigo.iaAngulo = Math.max(20, Math.min(75, anguloOptimo + errorAng));
        enemigo.iaPotencia = Math.max(35, Math.min(95, potenciaOptima + errorPot));
        
        // Guardar ángulo para mostrar en el cañón
        game.anguloEnemigo = enemigo.iaAngulo;
        
        // Convertir a radianes
        const anguloRad = (enemigo.iaAngulo * Math.PI) / 180;
        const velocidadBase = enemigo.iaPotencia * 0.15;
        
        // Determinar tipo visual y posición según tipo de tropa enemiga
        const tipoVisual = enemigo.tipoVisual || 'soldado';
        let startX, startY;
        
        // La IA dispara hacia la izquierda (hacia el jugador) y hacia arriba
        if (tipoVisual === 'tanque') {
            const cañonLargo = 60;
            startX = enemigo.x - Math.cos(anguloRad) * cañonLargo;
            startY = enemigo.y - 55 - Math.sin(anguloRad) * cañonLargo;
        } else {
            const armaLargo = 45;
            startX = enemigo.x - Math.cos(anguloRad) * armaLargo;
            startY = enemigo.y - 55 - Math.sin(anguloRad) * armaLargo;
        }
        
        // Determinar estilo de proyectil según arma
        const proyectilVisual = this.getProyectilVisual(arma);

        // vx negativo = hacia la izquierda (donde está el jugador), vy negativo = hacia arriba
        game.proyectilActivo = {
            x: startX,
            y: startY,
            vx: -Math.cos(anguloRad) * velocidadBase,
            vy: -Math.sin(anguloRad) * velocidadBase,
            gravedad: 0.15,
            viento: game.viento * 0.02,
            daño: arma.daño,
            radio: arma.radioExplosion || 40,
            color: proyectilVisual.color,
            tipo: proyectilVisual.tipo,
            tamaño: proyectilVisual.tamaño,
            trail: [],
            propietario: 'enemigo',
            arma: arma
        };
        
        console.log(`🤖 IA dispara! Dificultad: ${dificultad}, Ángulo: ${enemigo.iaAngulo.toFixed(1)}°, Potencia: ${enemigo.iaPotencia.toFixed(1)}%`);
    }
    
    this.cambiarArmaShooter = function(idx) {
        const game = this.shooterGame;
        if (!game) return;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        if (idx < game.jugador.tropa.armas.length) {
            game.jugador.armaActual = idx;
            const arma = game.jugador.tropa.armas[idx];
            
            // Actualizar clases en el nuevo selector Tank Stars
            $('#tankWeapons .tank-weapon-btn').removeClass('active');
            const $botonArma = $(`#tankWeapons .tank-weapon-btn[data-arma="${idx}"]`);
            $botonArma.addClass('active');
            
            // Efecto visual de cambio de arma
            this.mostrarNotificacionArma(arma);
            
            console.log(`🔫 Arma cambiada a: ${arma.nombre}`);
        }
    }
    
    // Mostrar notificación visual del cambio de arma
    this.mostrarNotificacionArma = function(arma) {
        // Eliminar notificación anterior si existe
        $('.weapon-change-notification').remove();
        
        // Crear nueva notificación
        const $notif = $(`
            <div class="weapon-change-notification">
                <span class="weapon-emoji">${arma.emoji || '🔫'}</span>
                <div class="weapon-info">
                    <span class="weapon-name">${arma.nombre}</span>
                    <span class="weapon-damage">⚔️ ${arma.daño} DMG</span>
                </div>
            </div>
        `);
        
        // Añadir al canvas
        $('#shooterCanvas').parent().append($notif);
        
        // Animar entrada
        $notif.addClass('show');
        
        // Eliminar después de 1.5 segundos
        setTimeout(() => {
            $notif.removeClass('show');
            setTimeout(() => $notif.remove(), 300);
        }, 1500);
    }
    
    // ========== GAME LOOP TANK STARS ==========
    this.gameLoopShooter = function() {
        const game = this.shooterGame;
        if (!game || !game.activo) return;
        
        const ahora = Date.now();
        
        // ===== ACTUALIZAR TIMER DEL TURNO =====
        if (game.fase === 'apuntar' && game.turno === 'jugador') {
            const tiempoTurnoRestante = Math.max(0, game.tiempoTurno - (ahora - game.inicioTurno));
            const segundosTurno = Math.ceil(tiempoTurnoRestante / 1000);
            $('#turnTimer').text(segundosTurno);
            
            if (segundosTurno <= 5) {
                $('#turnTimer').addClass('warning');
            }
            
            // Tiempo agotado - disparo automático
            if (tiempoTurnoRestante <= 0) {
                this.dispararTurno();
            }
        }
        
        // ===== LÓGICA POR FASE =====
        switch (game.fase) {
            case 'apuntar':
                // Turno de la IA - espera un poco y luego dispara
                if (game.turno === 'enemigo' && game.modo === 'ia') {
                    if (!game.iaEsperando) {
                        game.iaEsperando = true;
                        // La IA "piensa" entre 1 y 2 segundos
                        setTimeout(() => {
                            if (game.activo && game.turno === 'enemigo') {
                                this.dispararIA();
                                game.fase = 'disparando';
                            }
                        }, 1000 + Math.random() * 1000);
                    }
                }
                break;
                
            case 'disparando':
                // Actualizar proyectil activo
                if (game.proyectilActivo) {
                    this.actualizarProyectilTankStars();
                }
                break;
                
            case 'esperando':
                // Esperar después de explosión antes de cambiar turno
                break;
                
            case 'cambioTurno':
                // Animación de cambio de turno
                break;
        }
        
        // ===== ACTUALIZAR EFECTOS Y EXPLOSIONES =====
        this.actualizarEfectosTankStars();
        
        // ===== ACTUALIZAR HUD =====
        this.actualizarHUDTankStars();
        
        // ===== RENDERIZAR =====
        this.renderizarTankStars();
        
        // Siguiente frame
        game.animationFrame = requestAnimationFrame(() => this.gameLoopShooter());
    }
    
    // ========== ACTUALIZAR PROYECTIL CON FÍSICA PARABÓLICA ==========
    this.actualizarProyectilTankStars = function() {
        const game = this.shooterGame;
        const p = game.proyectilActivo;
        if (!p) return;
        
        // Inicializar trail si no existe
        if (!p.trail) p.trail = [];
        
        // Guardar posición para la estela
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 30) p.trail.shift();
        
        // Física parabólica
        p.vy += p.gravedad; // Gravedad
        p.vx += p.viento;   // Viento
        p.x += p.vx;
        p.y += p.vy;
        
        // Comprobar colisión con el objetivo
        const objetivo = p.propietario === 'jugador' ? game.enemigo : game.jugador;
        const dx = p.x - objetivo.x;
        const dy = p.y - (objetivo.y - 30);
        const distancia = Math.sqrt(dx * dx + dy * dy);
        
        if (distancia < 50) { // Radio de impacto
            this.impactoProyectil(p, objetivo);
            return;
        }
        
        // Comprobar si salió del mapa o tocó el suelo
        const suelo = game.mapa.config.alto - 50;
        if (p.y >= suelo || p.x < -50 || p.x > game.mapa.config.ancho + 50 || p.y < -200) {
            // Impacto en el suelo o fuera del mapa
            this.impactoProyectil(p, null);
        }
    }
    
    this.impactoProyectil = function(proyectil, objetivo) {
        const game = this.shooterGame;
        
        // Crear explosión épica
        const explosionX = proyectil.x;
        const explosionY = Math.min(proyectil.y, game.mapa.config.alto - 50);
        
        game.explosiones.push({
            x: explosionX,
            y: explosionY,
            radio: proyectil.radio,
            radioMax: proyectil.radio,
            fase: 'expansion',
            inicio: Date.now(),
            color: proyectil.propietario === 'jugador' ? '#FFD700' : '#FF4444'
        });
        
        // Añadir a efectos para el renderizado
        game.efectos.push({
            tipo: 'explosion',
            x: explosionX,
            y: explosionY,
            inicio: Date.now(),
            duracion: 800
        });
        
        // Si impactó a un objetivo
        if (objetivo) {
            let daño = proyectil.daño;
            
            // Calcular distancia para modificar daño según arma
            const arma = proyectil.arma;
            if (arma) {
                const distancia = Math.sqrt(Math.pow(explosionX - (proyectil.propietario === 'jugador' ? game.jugador.x : game.enemigo.x), 2));
                
                // ESCOPETA: Más daño a corta distancia (multiplicador 1.5x - 3x)
                if (arma.tipo === 'escopeta' || arma.tipo === 'shotgun') {
                    const distanciaMax = game.mapa.config.ancho;
                    const bonusCercania = 1 + (2 * (1 - Math.min(distancia / distanciaMax, 1)));
                    daño = Math.round(daño * bonusCercania);
                    console.log(`🔫 Escopeta: Distancia ${Math.round(distancia)}px, Bonus x${bonusCercania.toFixed(2)}, Daño final: ${daño}`);
                }
                
                // SNIPER: Más daño a larga distancia
                if (arma.tipo === 'sniper' || arma.tipo === 'franco') {
                    const distanciaMin = 200;
                    if (distancia > distanciaMin) {
                        const bonusLejania = 1 + (distancia / 800);
                        daño = Math.round(daño * Math.min(bonusLejania, 2));
                    }
                }
                
                // Daño por proximidad de explosión
                const distanciaAlObjetivo = Math.sqrt(
                    Math.pow(explosionX - objetivo.x, 2) + 
                    Math.pow(explosionY - objetivo.y, 2)
                );
                const radioExplosion = proyectil.radio || 40;
                const factorProximidad = Math.max(0.3, 1 - (distanciaAlObjetivo / radioExplosion));
                daño = Math.round(daño * factorProximidad);
            }
            
            objetivo.vida = Math.max(0, objetivo.vida - daño);
            
            // Actualizar stats
            if (proyectil.propietario === 'jugador') {
                game.jugador.stats.impactos++;
                game.jugador.stats.dañoHecho += daño;
            } else {
                game.jugador.stats.dañoRecibido += daño;
            }
            
            // Efecto de daño en el canvas
            game.efectos.push({
                tipo: 'daño',
                x: objetivo.x,
                y: objetivo.y - 100,
                cantidad: daño,
                inicio: Date.now(),
                duracion: 1500
            });
            
            // Mostrar daño
            this.mostrarIndicadorDaño(objetivo.x, objetivo.y - 60, daño);
            this.screenShake(daño);
            
            console.log(`💥 ¡IMPACTO! ${daño} de daño. Vida restante: ${objetivo.vida}`);
            
            // Comprobar si murió
            if (objetivo.vida <= 0) {
                game.proyectilActivo = null;
                setTimeout(() => {
                    this.finalizarShooter(proyectil.propietario === 'jugador' ? 'victoria' : 'derrota');
                }, 1500);
                return;
            }
        } else {
            console.log(`💨 Proyectil falló`);
        }
        
        // Limpiar proyectil y cambiar turno
        game.proyectilActivo = null;
        game.fase = 'esperando';
        
        // Esperar a que termine la explosión y cambiar turno
        setTimeout(() => {
            this.cambiarTurno();
        }, 1200);
    }
    
    this.cambiarTurno = function(desdeSincro = false) {
        const game = this.shooterGame;
        if (!game) return;
        
        // En multijugador, el host controla los turnos
        const esMulti = game.modo === 'multi';
        const esHost = game.esHost;
        
        // Cambiar turno
        game.turno = game.turno === 'jugador' ? 'enemigo' : 'jugador';
        game.turnoNumero++;
        game.fase = 'movimiento'; // Empieza con movimiento
        game.inicioTurno = Date.now();
        game.iaEsperando = false;
        
        // Resetear movimiento para el nuevo turno
        game.movimientoRestante = game.movimientoMax;
        
        // Cambiar viento ligeramente cada turno (solo host en multi, o siempre en IA)
        if (!esMulti || esHost) {
            game.viento += (Math.random() - 0.5) * 1;
            game.viento = Math.max(-3, Math.min(3, game.viento));
        }
        this.actualizarViento();
        
        // En multijugador, enviar cambio de turno al rival
        if (esMulti && !desdeSincro && ws) {
            ws.enviarCambioTurno(game.turnoNumero, game.viento);
        }
        
        // Actualizar UI
        if (game.turno === 'jugador') {
            $('#turnIndicator').removeClass('enemy').html('<span class="turn-text">🎯 TU TURNO</span>');
            $('#controlsPanel').removeClass('disabled firing').show();
            $('#turnTimer').removeClass('warning').text('30');
            
            // Mostrar controles de movimiento, ocultar apuntar
            $('#moveControls').removeClass('hidden');
            $('#aimControls').addClass('hidden');
            $('#phaseIndicator').html('🚶 <b>MOVIMIENTO</b> - Usa A/D para moverte, ESPACIO para apuntar');
            this.actualizarBarraMovimiento();
        } else {
            $('#turnIndicator').addClass('enemy').html('<span class="turn-text">⏳ TURNO ENEMIGO</span>');
            $('#controlsPanel').addClass('disabled');
            $('#moveControls').addClass('hidden');
            $('#aimControls').addClass('hidden');
            
            // La IA no se mueve, pasa directamente a apuntar
            if (game.modo === 'ia') {
                game.fase = 'apuntar';
            }
            // En multijugador, esperamos al disparo del rival
            if (esMulti) {
                game.fase = 'esperandoRival';
            }
        }
        
        $('#roundNumber').text(Math.ceil(game.turnoNumero / 2));
        
        console.log(`🔄 Turno ${game.turnoNumero}: ${game.turno} (Multi: ${esMulti})`);
    }
    
    this.actualizarEfectosTankStars = function() {
        const game = this.shooterGame;
        const ahora = Date.now();
        
        // Actualizar explosiones
        game.explosiones = game.explosiones.filter(exp => {
            const edad = ahora - exp.inicio;
            if (edad > 800) return false;
            
            if (exp.fase === 'expansion' && edad > 200) {
                exp.fase = 'contraccion';
            }
            
            return true;
        });
        
        // Actualizar efectos
        game.efectos = game.efectos.filter(e => ahora - e.inicio < e.duracion);
    }
    
    this.actualizarHUDTankStars = function() {
        const game = this.shooterGame;
        
        // Vida del jugador
        const vidaPctJugador = (game.jugador.vida / game.jugador.vidaMax) * 100;
        $('#hudVidaJugador').css('width', vidaPctJugador + '%');
        $('#hudVidaTexto').text(Math.round(game.jugador.vida));
        
        // Vida del enemigo
        const vidaPctEnemigo = (game.enemigo.vida / game.enemigo.vidaMax) * 100;
        $('#hudVidaEnemigo').css('width', vidaPctEnemigo + '%');
        $('#hudVidaEnemigoTexto').text(Math.round(game.enemigo.vida));
    }

    // ========== MANTENER COMPATIBILIDAD CON FUNCIONES EXISTENTES ==========
    this.actualizarFisicaShooter = function() {
        // No se usa en modo Tank Stars
    }

    this.actualizarEntidadFisica = function(entidad, keys, mapa, gravedad) {
        // No se usa en modo Tank Stars
        
        // Movimiento horizontal
        if (keys.a) {
            entidad.vx = -vel;
            entidad.direccion = -1;
        } else if (keys.d) {
            entidad.vx = vel;
            entidad.direccion = 1;
        } else {
            entidad.vx *= 0.8; // Fricción
        }
        
        // Salto
        if ((keys.w || keys.espacio) && entidad.enSuelo) {
            entidad.vy = -salto;
            entidad.enSuelo = false;
        }
        
        // Agacharse
        entidad.agachado = keys.s;
        
        // Gravedad
        entidad.vy += gravedad;
        
        // Aplicar velocidad
        entidad.x += entidad.vx;
        entidad.y += entidad.vy;
        
        // Colisión con suelo
        const sueloY = mapa.config.alto - 50;
        if (entidad.y >= sueloY) {
            entidad.y = sueloY;
            entidad.vy = 0;
            entidad.enSuelo = true;
        }
        
        // Límites del mapa
        const ancho = tropa.stats.tamaño || 30;
        if (entidad.x < ancho) entidad.x = ancho;
        if (entidad.x > mapa.config.ancho - ancho) entidad.x = mapa.config.ancho - ancho;
        
        // Colisión con obstáculos
        if (mapa.config.obstaculos) {
            for (const obs of mapa.config.obstaculos) {
                if (this.colisionRectangulo(entidad, obs, ancho)) {
                    // Resolver colisión simple
                    if (entidad.vy > 0 && entidad.y < obs.y) {
                        entidad.y = obs.y - ancho;
                        entidad.vy = 0;
                        entidad.enSuelo = true;
                    }
                }
            }
        }
    }
    
    this.colisionRectangulo = function(entidad, obstaculo, radio) {
        return entidad.x + radio > obstaculo.x &&
               entidad.x - radio < obstaculo.x + obstaculo.ancho &&
               entidad.y + radio > obstaculo.y &&
               entidad.y - radio < obstaculo.y + obstaculo.alto;
    }
    
    this.actualizarIAShooter = function() {
        const game = this.shooterGame;
        const enemigo = game.enemigo;
        const jugador = game.jugador;
        const ia = enemigo.iaState;
        const ahora = Date.now();
        
        // Tiempo de reacción - solo decide nuevas acciones cada cierto tiempo
        if (ahora - ia.ultimaAccion < ia.reaccion) return;
        ia.ultimaAccion = ahora;
        
        // Reiniciar teclas de la IA
        const iaKeys = { w: false, a: false, s: false, d: false, espacio: false, shift: false };
        
        // Calcular distancia al jugador
        const dx = jugador.x - enemigo.x;
        const dy = jugador.y - enemigo.y;
        const distancia = Math.sqrt(dx * dx + dy * dy);
        
        // Decidir acción según patrón
        const arma = enemigo.tropa.armas[enemigo.armaActual];
        const alcanceOptimo = arma.alcance * 0.7;
        
        if (ia.patron === 'agresivo') {
            // Acercarse al jugador
            if (distancia > alcanceOptimo) {
                if (dx > 0) iaKeys.d = true;
                else iaKeys.a = true;
            }
            // Saltar a veces
            if (Math.random() < 0.1 && enemigo.enSuelo) {
                iaKeys.w = true;
            }
        } else if (ia.patron === 'defensivo') {
            // Mantener distancia
            if (distancia < alcanceOptimo * 0.5) {
                if (dx > 0) iaKeys.a = true;
                else iaKeys.d = true;
            }
            // Agacharse a veces
            if (Math.random() < 0.1) {
                iaKeys.s = true;
            }
        } else {
            // Equilibrado - moverse aleatoriamente
            if (Math.random() < 0.3) {
                iaKeys.d = Math.random() > 0.5;
                iaKeys.a = !iaKeys.d;
            }
            if (Math.random() < 0.15 && enemigo.enSuelo) {
                iaKeys.w = true;
            }
        }
        
        // Guardar las iaKeys en el enemigo para que la física las use
        enemigo.iaKeys = iaKeys;
        
        // Disparar si está en rango
        if (distancia < arma.alcance && Math.random() < 0.6) {
            this.dispararIA();
        }
        
        // Cambiar patrón ocasionalmente
        if (Math.random() < 0.01) {
            const patrones = ['agresivo', 'defensivo', 'equilibrado'];
            ia.patron = patrones[Math.floor(Math.random() * patrones.length)];
        }
    }
    
    this.dispararIA = function() {
        const game = this.shooterGame;
        const enemigo = game.enemigo;
        const jugador = game.jugador;
        const arma = enemigo.tropa.armas[enemigo.armaActual];
        
        const ahora = Date.now();
        const ultimoDisparo = enemigo.ultimoCañon[arma.id] || 0;
        
        if (ahora - ultimoDisparo < arma.cadencia) return;
        
        enemigo.ultimoCañon[arma.id] = ahora;
        
        // Dirección hacia el jugador con algo de imprecisión
        const dx = jugador.x - enemigo.x;
        const dy = (jugador.y - 20) - enemigo.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Imprecisión de la IA (más difícil = más preciso)
        const imprecision = 0.2;
        const dirX = (dx / dist) + (Math.random() - 0.5) * imprecision;
        const dirY = (dy / dist) + (Math.random() - 0.5) * imprecision;
        
        const perdigones = arma.perdigones || 1;
        const spread = arma.dispersion || 0;
        
        for (let i = 0; i < perdigones; i++) {
            const spreadAngle = (Math.random() - 0.5) * spread * (Math.PI / 180);
            const cos = Math.cos(spreadAngle);
            const sin = Math.sin(spreadAngle);
            
            const finalDirX = dirX * cos - dirY * sin;
            const finalDirY = dirX * sin + dirY * cos;
            
            game.proyectiles.push({
                x: enemigo.x,
                y: enemigo.y - 20,
                vx: finalDirX * arma.proyectilVelocidad,
                vy: finalDirY * arma.proyectilVelocidad,
                daño: arma.daño,
                alcance: arma.alcance,
                distRecorrida: 0,
                propietario: 'enemigo',
                tipo: arma.tipo || 'bala',
                color: '#FF4444',
                tamaño: arma.tamañoProyectil || 5
            });
        }
    }
    
    this.actualizarProyectilesShooter = function() {
        const game = this.shooterGame;
        
        game.proyectiles = game.proyectiles.filter(p => {
            // Mover proyectil
            p.x += p.vx;
            p.y += p.vy;
            p.distRecorrida += Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            
            // Eliminar si salió del mapa o excedió alcance
            if (p.x < 0 || p.x > game.mapa.config.ancho ||
                p.y < 0 || p.y > game.mapa.config.alto ||
                p.distRecorrida > p.alcance) {
                return false;
            }
            
            return true;
        });
    }
    
    this.actualizarEfectosShooter = function() {
        const game = this.shooterGame;
        const ahora = Date.now();
        
        game.efectos = game.efectos.filter(e => {
            return ahora - e.inicio < e.duracion;
        });
    }
    
    this.comprobarColisionesShooter = function() {
        const game = this.shooterGame;
        
        game.proyectiles = game.proyectiles.filter(p => {
            // Determinar el objetivo
            const objetivo = p.propietario === 'jugador' ? game.enemigo : game.jugador;
            // CORREGIDO: tamaño era objeto {ancho, alto}, ahora usamos el ancho como radio
            const tamañoObj = objetivo.tropa.stats.tamaño;
            const radioColision = typeof tamañoObj === 'object' ? tamañoObj.ancho / 2 + 10 : 30;
            
            // Comprobar colisión con hitbox más generosa
            const dx = p.x - objetivo.x;
            const dy = p.y - (objetivo.y - 30); // Centro del cuerpo
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < radioColision + (p.tamaño || 5)) {
                // ¡¡IMPACTO!!
                console.log(`🎯 Impacto! Daño: ${p.daño} a ${p.propietario === 'jugador' ? 'enemigo' : 'jugador'}`);
                this.aplicarDañoShooter(objetivo, p.daño, p.propietario);
                
                if (p.propietario === 'jugador') {
                    game.jugador.stats.impactos++;
                    game.jugador.stats.dañoHecho += p.daño;
                    
                    // ¡Subir definitiva RÁPIDO al acertar! (+5% por impacto)
                    game.jugador.ultimateCharge = Math.min(100, game.jugador.ultimateCharge + 5);
                }
                
                // Crear efecto de impacto
                game.efectos.push({
                    tipo: 'impacto',
                    x: p.x,
                    y: p.y,
                    duracion: 200,
                    inicio: Date.now(),
                    color: p.color
                });
                
                return p.atraviesa; // Si atraviesa, no eliminar
            }
            
            return true;
        });
    }
    
    this.aplicarDañoShooter = function(objetivo, daño, atacante) {
        const game = this.shooterGame;
        
        objetivo.vida = Math.max(0, objetivo.vida - daño);
        
        if (atacante === 'jugador') {
            game.jugador.stats.dañoHecho += daño;
        } else {
            game.jugador.stats.dañoRecibido += daño;
            // Screen shake cuando el jugador recibe daño
            this.screenShake(daño);
        }
        
        // Mostrar indicador de daño
        this.mostrarIndicadorDaño(objetivo.x, objetivo.y - 40, daño);
        
        // Flash rojo en la pantalla si el jugador recibe daño
        if (atacante === 'enemigo') {
            this.flashPantalla('rgba(255, 0, 0, 0.3)');
        }
        
        // Comprobar muerte
        if (objetivo.vida <= 0) {
            if (objetivo === game.enemigo) {
                this.finalizarShooter('victoria');
            } else {
                this.finalizarShooter('derrota');
            }
        }
    }
    
    this.mostrarIndicadorDaño = function(x, y, daño) {
        const game = this.shooterGame;
        if (!game || !game.canvas) return;
        
        // Calcular escala real del canvas (CSS vs atributo)
        const rect = game.canvas.getBoundingClientRect();
        const scaleX = rect.width / game.canvas.width;
        const scaleY = rect.height / game.canvas.height;
        
        // Posición en pantalla
        const screenX = rect.left + (x * scaleX);
        const screenY = rect.top + (y * scaleY);
        
        // Determinar si es daño crítico (>30)
        const isCritical = daño >= 30;
        const className = isCritical ? 'damage-indicator critical' : 'damage-indicator';
        
        const indicator = $(`<div class="${className}">-${Math.round(daño)}</div>`);
        indicator.css({
            left: screenX + 'px',
            top: screenY + 'px',
            transform: 'translate(-50%, -50%)'
        });
        
        $('body').append(indicator);
        
        setTimeout(() => indicator.remove(), isCritical ? 1500 : 1200);
    }
    
    // Efecto de screen shake cuando recibimos daño
    this.screenShake = function(intensidad) {
        const $arena = $('#shooterArena');
        const shakeAmount = Math.min(intensidad / 3, 15);
        
        let shakeCount = 0;
        const maxShakes = 6;
        
        const shake = () => {
            if (shakeCount >= maxShakes) {
                $arena.css('transform', 'translate(0, 0)');
                return;
            }
            
            const x = (Math.random() - 0.5) * shakeAmount * (1 - shakeCount / maxShakes);
            const y = (Math.random() - 0.5) * shakeAmount * (1 - shakeCount / maxShakes);
            $arena.css('transform', `translate(${x}px, ${y}px)`);
            
            shakeCount++;
            requestAnimationFrame(shake);
        };
        
        shake();
    }
    
    // Flash de color en la pantalla
    this.flashPantalla = function(color) {
        const $flash = $(`<div class="damage-flash"></div>`);
        $flash.css({
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: color,
            pointerEvents: 'none',
            zIndex: 9998,
            animation: 'flashFade 0.3s ease-out forwards'
        });
        
        $('body').append($flash);
        setTimeout(() => $flash.remove(), 300);
    }

    this.actualizarHUDShooter = function() {
        const game = this.shooterGame;
        
        // Vida del jugador
        const vidaPctJugador = (game.jugador.vida / game.jugador.vidaMax) * 100;
        $('#hudVidaJugador').css('width', vidaPctJugador + '%');
        $('#hudVidaTexto').text(`${Math.round(game.jugador.vida)}/${game.jugador.vidaMax}`);
        
        // Vida del enemigo
        const vidaPctEnemigo = (game.enemigo.vida / game.enemigo.vidaMax) * 100;
        $('#hudVidaEnemigo').css('width', vidaPctEnemigo + '%');
        $('#hudVidaEnemigoTexto').text(`${Math.round(game.enemigo.vida)}/${game.enemigo.vidaMax}`);
    }
    
    this.actualizarUltimateBar = function() {
        const game = this.shooterGame;
        const charge = game.jugador.ultimateCharge;
        
        $('#ultimateFill').css('width', charge + '%');
        
        if (charge >= 100 && !game.jugador.ultimateActivo) {
            $('#ultimateFill').addClass('ready');
            $('#ultimateLabel').addClass('ready').text('🔥 ¡DEFINITIVA LISTA! [Q]');
        }
    }
    
    this.renderizarShooter = function() {
        const game = this.shooterGame;
        const ctx = game.ctx;
        const mapa = game.mapa;
        
        if (!ctx) {
            console.error("CTX no disponible!");
            return;
        }
        
        const W = game.canvas.width;
        const H = game.canvas.height;
        
        // ========== FONDO ÉPICO ==========
        // Cielo con gradiente
        const skyGradient = ctx.createLinearGradient(0, 0, 0, H * 0.7);
        skyGradient.addColorStop(0, '#1a1a3e');
        skyGradient.addColorStop(0.3, '#2d3a5f');
        skyGradient.addColorStop(0.6, '#4a6fa5');
        skyGradient.addColorStop(1, '#87CEEB');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, W, H);
        
        // Estrellas pequeñas (solo en la parte superior)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 30; i++) {
            const starX = (i * 137 + game.tiempoInicio) % W;
            const starY = (i * 89) % (H * 0.4);
            ctx.beginPath();
            ctx.arc(starX, starY, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Montañas de fondo
        ctx.fillStyle = '#2d4a3d';
        ctx.beginPath();
        ctx.moveTo(0, H - 100);
        for (let x = 0; x <= W; x += 50) {
            const peakHeight = Math.sin(x * 0.01) * 80 + Math.sin(x * 0.02) * 40;
            ctx.lineTo(x, H - 100 - peakHeight);
        }
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fill();
        
        // ========== SUELO CON TEXTURA ==========
        const groundGradient = ctx.createLinearGradient(0, H - 50, 0, H);
        groundGradient.addColorStop(0, '#5d4037');
        groundGradient.addColorStop(0.3, '#4e342e');
        groundGradient.addColorStop(1, '#3e2723');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, H - 50, W, 50);
        
        // Línea de hierba
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, H - 50);
        ctx.lineTo(W, H - 50);
        ctx.stroke();
        
        // Detalles de hierba
        ctx.strokeStyle = '#66BB6A';
        ctx.lineWidth = 2;
        for (let x = 0; x < W; x += 15) {
            const grassHeight = 8 + Math.sin(x * 0.1 + Date.now() * 0.002) * 3;
            ctx.beginPath();
            ctx.moveTo(x, H - 50);
            ctx.lineTo(x - 3, H - 50 - grassHeight);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, H - 50);
            ctx.lineTo(x + 3, H - 50 - grassHeight * 0.8);
            ctx.stroke();
        }
        
        // ========== OBSTÁCULOS CON ESTILO ==========
        if (mapa.config.obstaculos) {
            for (const obs of mapa.config.obstaculos) {
                // Sombra del obstáculo
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(obs.x + 5, obs.y + 5, obs.ancho, obs.alto);
                
                // Obstáculo con gradiente
                const obsGradient = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.ancho, obs.y + obs.alto);
                obsGradient.addColorStop(0, obs.color || '#666');
                obsGradient.addColorStop(1, '#333');
                ctx.fillStyle = obsGradient;
                ctx.fillRect(obs.x, obs.y, obs.ancho, obs.alto);
                
                // Borde del obstáculo
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 2;
                ctx.strokeRect(obs.x, obs.y, obs.ancho, obs.alto);
            }
        }
        
        // ========== PROYECTILES ÉPICOS ==========
        for (const p of game.proyectiles) {
            // Estela del proyectil
            ctx.beginPath();
            const trailLength = 20;
            const trailGradient = ctx.createLinearGradient(
                p.x - p.vx * 2, p.y - p.vy * 2, p.x, p.y
            );
            trailGradient.addColorStop(0, 'rgba(255,200,0,0)');
            trailGradient.addColorStop(1, p.color);
            ctx.strokeStyle = trailGradient;
            ctx.lineWidth = (p.tamaño || 5) * 1.5;
            ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            
            // Proyectil principal con brillo
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.tamaño || 5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            
            // Brillo central
            ctx.beginPath();
            ctx.arc(p.x, p.y, (p.tamaño || 5) * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fill();
        }
        
        // ========== EFECTOS VISUALES ==========
        const ahora = Date.now();
        game.efectos = game.efectos.filter(e => ahora - e.inicio < e.duracion);
        
        for (const e of game.efectos) {
            const progress = (ahora - e.inicio) / e.duracion;
            const alpha = 1 - progress;
            
            if (e.tipo === 'flash') {
                const radius = 10 + progress * 20;
                ctx.beginPath();
                ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.8})`;
                ctx.fill();
            } else if (e.tipo === 'impacto') {
                // Explosión con anillos
                for (let r = 0; r < 3; r++) {
                    const radius = 10 + progress * 30 + r * 8;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, ${100 + r * 50}, 0, ${alpha * 0.6})`;
                    ctx.lineWidth = 3 - r;
                    ctx.stroke();
                }
                
                // Partículas
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const dist = progress * 40;
                    const px = e.x + Math.cos(angle) * dist;
                    const py = e.y + Math.sin(angle) * dist;
                    ctx.beginPath();
                    ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 150, 0, ${alpha})`;
                    ctx.fill();
                }
            }
        }
        
        // ========== DIBUJAR ENTIDADES ==========
        this.dibujarEntidadShooter(ctx, game.jugador, '#4CAF50', true);
        this.dibujarEntidadShooter(ctx, game.enemigo, '#f44336', false);
        
        // ========== INDICADOR DE DIRECCIÓN DE DISPARO ==========
        if (game.mouse) {
            const jugador = game.jugador;
            const dx = game.mouse.x - jugador.x;
            const dy = game.mouse.y - (jugador.y - 30);
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                const dirX = dx / dist;
                const dirY = dy / dist;
                
                // Línea de apuntado
                ctx.beginPath();
                ctx.moveTo(jugador.x, jugador.y - 30);
                ctx.lineTo(jugador.x + dirX * 60, jugador.y - 30 + dirY * 60);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Punto de mira
                ctx.beginPath();
                ctx.arc(jugador.x + dirX * 60, jugador.y - 30 + dirY * 60, 5, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }
    
    // ============================================================
    // DIBUJAR ENTIDAD SEGÚN TIPO (Soldado, Francotirador o Tanque)
    // ============================================================
    this.dibujarTanqueTankStars = function(ctx, entidad, colorBase, esJugador, esActivo) {
        if (!entidad || !entidad.tropa) return;
        
        const tipoVisual = entidad.tipoVisual || 'soldado';
        
        switch (tipoVisual) {
            case 'tanque':
                this.dibujarTanque(ctx, entidad, colorBase, esJugador, esActivo);
                break;
            case 'francotirador':
                this.dibujarFrancotirador(ctx, entidad, colorBase, esJugador, esActivo);
                break;
            default:
                this.dibujarSoldado(ctx, entidad, colorBase, esJugador, esActivo);
        }
    }
    
    // ============================================================
    // DIBUJAR SOLDADO (Tropa básica)
    // ============================================================
    this.dibujarSoldado = function(ctx, entidad, colorBase, esJugador, esActivo) {
        const x = entidad.x;
        const y = entidad.y;
        const dir = esJugador ? 1 : -1;
        const game = this.tankGame;
        
        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== PIERNAS =====
        ctx.fillStyle = '#2d4a2d';
        ctx.fillRect(x - 12, y - 35, 10, 35);
        ctx.fillRect(x + 2, y - 35, 10, 35);
        
        // Botas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 14, y - 5, 12, 8);
        ctx.fillRect(x + 2, y - 5, 12, 8);
        
        // ===== CUERPO =====
        const bodyGradient = ctx.createLinearGradient(x - 18, y - 70, x + 18, y - 35);
        bodyGradient.addColorStop(0, this.ajustarBrillo(colorBase, 1.2));
        bodyGradient.addColorStop(0.5, colorBase);
        bodyGradient.addColorStop(1, this.ajustarBrillo(colorBase, 0.8));
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.roundRect(x - 18, y - 70, 36, 40, 5);
        ctx.fill();
        ctx.strokeStyle = this.ajustarBrillo(colorBase, 0.5);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Chaleco táctico
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x - 12, y - 65, 24, 30);
        
        // ===== BRAZOS CON ARMA =====
        let anguloBrazo;
        if (game && esJugador && game.fase === 'apuntar') {
            anguloBrazo = -game.angulo * (Math.PI / 180);
        } else if (game && !esJugador) {
            anguloBrazo = Math.PI + (game.anguloEnemigo || 45) * (Math.PI / 180);
        } else {
            anguloBrazo = esJugador ? -Math.PI/4 : Math.PI + Math.PI/4;
        }
        
        const brazoLargo = 35;
        const brazoEndX = x + Math.cos(anguloBrazo) * brazoLargo * dir;
        const brazoEndY = y - 55 + Math.sin(anguloBrazo) * brazoLargo;
        
        // Brazo
        ctx.strokeStyle = '#DDBEA0';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + dir * 15, y - 60);
        ctx.lineTo(brazoEndX, brazoEndY);
        ctx.stroke();
        
        // Arma (rifle/pistola)
        const arma = entidad.tropa?.armas?.[entidad.armaActual] || { tipo: 'rifle' };
        const armaColor = arma.tipo === 'escopeta' ? '#5D4037' : '#333';
        const armaLargo = arma.tipo === 'escopeta' ? 40 : 30;
        
        ctx.strokeStyle = armaColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(brazoEndX, brazoEndY);
        ctx.lineTo(brazoEndX + Math.cos(anguloBrazo) * armaLargo * dir, brazoEndY + Math.sin(anguloBrazo) * armaLargo);
        ctx.stroke();
        
        // Cañón del arma
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const armaEndX = brazoEndX + Math.cos(anguloBrazo) * (armaLargo + 15) * dir;
        const armaEndY = brazoEndY + Math.sin(anguloBrazo) * (armaLargo + 15);
        ctx.moveTo(brazoEndX + Math.cos(anguloBrazo) * armaLargo * dir, brazoEndY + Math.sin(anguloBrazo) * armaLargo);
        ctx.lineTo(armaEndX, armaEndY);
        ctx.stroke();
        
        // ===== CABEZA =====
        // Cuello
        ctx.fillStyle = '#DDBEA0';
        ctx.fillRect(x - 5, y - 78, 10, 10);
        
        // Cabeza
        ctx.fillStyle = '#FFE4C4';
        ctx.beginPath();
        ctx.arc(x, y - 88, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D4A574';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Casco militar
        ctx.fillStyle = esJugador ? '#2E7D32' : '#8B0000';
        ctx.beginPath();
        ctx.arc(x, y - 92, 15, Math.PI, 0, false);
        ctx.lineTo(x + 18, y - 88);
        ctx.lineTo(x - 18, y - 88);
        ctx.closePath();
        ctx.fill();
        
        // Visera del casco
        ctx.fillStyle = esJugador ? '#1B5E20' : '#5D0000';
        ctx.beginPath();
        ctx.ellipse(x + dir * 5, y - 88, 16, 4, 0, 0, Math.PI);
        ctx.fill();
        
        // Ojos
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x + dir * 5, y - 90, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x + dir * 6, y - 90, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== INDICADORES =====
        this.dibujarIndicadoresEntidad(ctx, entidad, x, y, esActivo);
    }
    
    // ============================================================
    // DIBUJAR FRANCOTIRADOR (Lancero/Sniper)
    // ============================================================
    this.dibujarFrancotirador = function(ctx, entidad, colorBase, esJugador, esActivo) {
        const x = entidad.x;
        const y = entidad.y;
        const dir = esJugador ? 1 : -1;
        const game = this.shooterGame;
        
        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== PIERNAS (más delgadas) =====
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(x - 10, y - 40, 8, 40);
        ctx.fillRect(x + 2, y - 40, 8, 40);
        
        // Botas ligeras
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(x - 11, y - 5, 10, 7);
        ctx.fillRect(x + 1, y - 5, 10, 7);
        
        // ===== CUERPO (más delgado) =====
        const bodyGradient = ctx.createLinearGradient(x - 15, y - 75, x + 15, y - 40);
        bodyGradient.addColorStop(0, this.ajustarBrillo(colorBase, 1.3));
        bodyGradient.addColorStop(0.5, colorBase);
        bodyGradient.addColorStop(1, this.ajustarBrillo(colorBase, 0.7));
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.roundRect(x - 15, y - 75, 30, 40, 4);
        ctx.fill();
        
        // Capa/poncho
        ctx.fillStyle = 'rgba(50,70,50,0.6)';
        ctx.beginPath();
        ctx.moveTo(x - 20, y - 70);
        ctx.lineTo(x + 20, y - 70);
        ctx.lineTo(x + 25, y - 45);
        ctx.lineTo(x - 25, y - 45);
        ctx.closePath();
        ctx.fill();
        
        // ===== BRAZOS CON RIFLE LARGO =====
        let anguloBrazo;
        if (esJugador && game.fase === 'apuntar') {
            anguloBrazo = -game.angulo * (Math.PI / 180);
        } else if (!esJugador) {
            anguloBrazo = Math.PI + (game.anguloEnemigo || 45) * (Math.PI / 180);
        } else {
            anguloBrazo = esJugador ? -Math.PI/6 : Math.PI + Math.PI/6;
        }
        
        const brazoLargo = 30;
        const brazoEndX = x + Math.cos(anguloBrazo) * brazoLargo * dir;
        const brazoEndY = y - 60 + Math.sin(anguloBrazo) * brazoLargo;
        
        // Brazos
        ctx.strokeStyle = '#DDBEA0';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + dir * 12, y - 65);
        ctx.lineTo(brazoEndX, brazoEndY);
        ctx.stroke();
        
        // Rifle de francotirador (largo)
        const arma = entidad.tropa.armas[entidad.armaActual];
        const esArco = arma.tipo === 'arco';
        
        if (esArco) {
            // Dibujar arco
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 4;
            ctx.beginPath();
            const arcoStartX = brazoEndX;
            const arcoStartY = brazoEndY - 25;
            const arcoEndX = brazoEndX;
            const arcoEndY = brazoEndY + 25;
            const arcoCurveX = brazoEndX + dir * 30;
            ctx.moveTo(arcoStartX, arcoStartY);
            ctx.quadraticCurveTo(arcoCurveX, brazoEndY, arcoEndX, arcoEndY);
            ctx.stroke();
            
            // Cuerda
            ctx.strokeStyle = '#DDD';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(arcoStartX, arcoStartY);
            ctx.lineTo(arcoEndX, arcoEndY);
            ctx.stroke();
        } else {
            // Rifle sniper
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(brazoEndX, brazoEndY);
            const rifleLargo = 55;
            ctx.lineTo(brazoEndX + Math.cos(anguloBrazo) * rifleLargo * dir, brazoEndY + Math.sin(anguloBrazo) * rifleLargo);
            ctx.stroke();
            
            // Mira telescópica
            ctx.fillStyle = '#1a1a1a';
            const miraX = brazoEndX + Math.cos(anguloBrazo) * 25 * dir;
            const miraY = brazoEndY + Math.sin(anguloBrazo) * 25 - 8;
            ctx.beginPath();
            ctx.ellipse(miraX, miraY, 8, 4, anguloBrazo, 0, Math.PI * 2);
            ctx.fill();
            
            // Lente de la mira
            ctx.fillStyle = '#4FC3F7';
            ctx.beginPath();
            ctx.arc(miraX + dir * 5, miraY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // ===== CABEZA =====
        ctx.fillStyle = '#DDBEA0';
        ctx.fillRect(x - 4, y - 82, 8, 8);
        
        ctx.fillStyle = '#FFE4C4';
        ctx.beginPath();
        ctx.arc(x, y - 92, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Capucha/gorro
        ctx.fillStyle = esJugador ? '#1B5E20' : '#5D0000';
        ctx.beginPath();
        ctx.arc(x, y - 95, 13, Math.PI, 0, false);
        ctx.lineTo(x + 15, y - 88);
        ctx.lineTo(x - 15, y - 88);
        ctx.closePath();
        ctx.fill();
        
        // Ojo con mira
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + dir * 4, y - 93, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = esJugador ? '#4CAF50' : '#f44336';
        ctx.beginPath();
        ctx.arc(x + dir * 5, y - 93, 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== INDICADORES =====
        this.dibujarIndicadoresEntidad(ctx, entidad, x, y, esActivo);
    }
    
    // ============================================================
    // DIBUJAR TANQUE (Vehículo blindado)
    // ============================================================
    this.dibujarTanque = function(ctx, entidad, colorBase, esJugador, esActivo) {
        const x = entidad.x;
        const y = entidad.y;
        const dir = esJugador ? 1 : -1;
        const game = this.shooterGame;
        
        // Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 50, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== ORUGAS =====
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.roundRect(x - 50, y - 15, 100, 28, 14);
        ctx.fill();
        
        // Detalle de las orugas
        ctx.fillStyle = '#2d2d2d';
        for (let i = -45; i < 50; i += 10) {
            ctx.fillRect(x + i, y - 12, 6, 22);
        }
        
        // Ruedas
        ctx.fillStyle = '#333';
        for (let i = -40; i <= 40; i += 20) {
            ctx.beginPath();
            ctx.arc(x + i, y, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // ===== CUERPO PRINCIPAL =====
        const bodyGradient = ctx.createLinearGradient(x - 45, y - 50, x + 45, y - 15);
        bodyGradient.addColorStop(0, this.ajustarBrillo(colorBase, 1.4));
        bodyGradient.addColorStop(0.5, colorBase);
        bodyGradient.addColorStop(1, this.ajustarBrillo(colorBase, 0.6));
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(x - 45, y - 15);
        ctx.lineTo(x - 50, y - 40);
        ctx.lineTo(x - 30, y - 55);
        ctx.lineTo(x + 30, y - 55);
        ctx.lineTo(x + 50, y - 40);
        ctx.lineTo(x + 45, y - 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.ajustarBrillo(colorBase, 0.4);
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Detalles del blindaje
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x - 35, y - 50, 70, 8);
        ctx.fillRect(x - 25, y - 38, 50, 5);
        
        // ===== TORRETA =====
        const torretaGradient = ctx.createRadialGradient(x, y - 60, 5, x, y - 55, 28);
        torretaGradient.addColorStop(0, this.ajustarBrillo(colorBase, 1.3));
        torretaGradient.addColorStop(1, this.ajustarBrillo(colorBase, 0.7));
        
        ctx.fillStyle = torretaGradient;
        ctx.beginPath();
        ctx.arc(x, y - 55, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.ajustarBrillo(colorBase, 0.4);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Escotilla
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(x - 8, y - 60, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== CAÑÓN PRINCIPAL =====
        // Usamos ángulo simple en grados y calculamos posición
        // Jugador: cañón hacia derecha y arriba
        // Enemigo: cañón hacia izquierda y arriba
        let anguloGrados;
        if (esJugador && game.fase === 'apuntar') {
            anguloGrados = game.angulo;
        } else if (!esJugador) {
            anguloGrados = game.anguloEnemigo || 45;
        } else {
            anguloGrados = 45; // Ángulo por defecto
        }
        
        const anguloRad = anguloGrados * (Math.PI / 180);
        const cañonLargo = 60;
        const direccionX = esJugador ? 1 : -1; // Jugador a derecha, enemigo a izquierda
        const cañonEndX = x + direccionX * Math.cos(anguloRad) * cañonLargo;
        const cañonEndY = y - 55 - Math.sin(anguloRad) * cañonLargo; // Negativo = hacia arriba
        
        // Cañón (tubo grueso)
        ctx.strokeStyle = '#2d2d2d';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - 55);
        ctx.lineTo(cañonEndX, cañonEndY);
        ctx.stroke();
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(x, y - 55);
        ctx.lineTo(cañonEndX, cañonEndY);
        ctx.stroke();
        
        // Freno de boca
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(cañonEndX, cañonEndY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(cañonEndX, cañonEndY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // ===== INDICADORES =====
        this.dibujarIndicadoresEntidad(ctx, entidad, x, y - 10, esActivo);
    }
    
    // ============================================================
    // INDICADORES COMUNES (Vida, turno, emoji)
    // ============================================================
    this.dibujarIndicadoresEntidad = function(ctx, entidad, x, y, esActivo) {
        const esJugador = entidad.direccion === 1;
        
        // Indicador de turno activo
        if (esActivo) {
            ctx.beginPath();
            ctx.arc(x, y - 60, 50, 0, Math.PI * 2);
            const auraGradient = ctx.createRadialGradient(x, y - 60, 20, x, y - 60, 50);
            auraGradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
            auraGradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.3)');
            auraGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = auraGradient;
            ctx.fill();
            
            // Flecha
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            const arrowY = y - 130 + Math.sin(Date.now() * 0.005) * 8;
            ctx.moveTo(x, arrowY);
            ctx.lineTo(x - 10, arrowY - 15);
            ctx.lineTo(x + 10, arrowY - 15);
            ctx.closePath();
            ctx.fill();
        }
        
        // Emoji de tropa
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(entidad.tropa.emoji, x, y - 145);
        ctx.shadowBlur = 0;
        
        // Barra de vida
        const barraAncho = 70;
        const barraAlto = 10;
        const barraX = x - barraAncho / 2;
        const barraY = y - 165;
        const vidaPct = entidad.vida / entidad.vidaMax;
        
        // Fondo
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(barraX - 2, barraY - 2, barraAncho + 4, barraAlto + 4, 6);
        ctx.fill();
        
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.roundRect(barraX, barraY, barraAncho, barraAlto, 4);
        ctx.fill();
        
        // Vida
        const vidaGradient = ctx.createLinearGradient(barraX, barraY, barraX + barraAncho, barraY);
        if (vidaPct > 0.6) {
            vidaGradient.addColorStop(0, '#43A047');
            vidaGradient.addColorStop(1, '#66BB6A');
        } else if (vidaPct > 0.3) {
            vidaGradient.addColorStop(0, '#F57C00');
            vidaGradient.addColorStop(1, '#FFB300');
        } else {
            vidaGradient.addColorStop(0, '#C62828');
            vidaGradient.addColorStop(1, '#EF5350');
        }
        ctx.fillStyle = vidaGradient;
        ctx.beginPath();
        ctx.roundRect(barraX, barraY, barraAncho * vidaPct, barraAlto, 4);
        ctx.fill();
        
        // Texto
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(entidad.vida)} HP`, x, barraY + barraAlto + 12);
    }
    
    // ============================================================
    // DIBUJAR PROYECTIL SEGÚN TIPO
    // ============================================================
    this.dibujarProyectilTipo = function(ctx, p) {
        const tipo = p.tipo || 'bullet';
        
        switch (tipo) {
            case 'arrow':
                // Flecha
                const angle = Math.atan2(p.vy, p.vx);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(angle);
                
                // Asta de la flecha
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(-20, -2, 25, 4);
                
                // Punta de la flecha
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.moveTo(8, 0);
                ctx.lineTo(0, -5);
                ctx.lineTo(0, 5);
                ctx.closePath();
                ctx.fill();
                
                // Plumas
                ctx.fillStyle = '#E74C3C';
                ctx.beginPath();
                ctx.moveTo(-20, 0);
                ctx.lineTo(-25, -6);
                ctx.lineTo(-18, 0);
                ctx.lineTo(-25, 6);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
                break;
                
            case 'rocket':
                // Cohete/Misil
                const rocketAngle = Math.atan2(p.vy, p.vx);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(rocketAngle);
                
                // Cuerpo del cohete
                ctx.fillStyle = '#C0392B';
                ctx.beginPath();
                ctx.roundRect(-15, -6, 25, 12, 3);
                ctx.fill();
                
                // Punta
                ctx.fillStyle = '#E74C3C';
                ctx.beginPath();
                ctx.moveTo(15, 0);
                ctx.lineTo(10, -6);
                ctx.lineTo(10, 6);
                ctx.closePath();
                ctx.fill();
                
                // Alas
                ctx.fillStyle = '#922B21';
                ctx.beginPath();
                ctx.moveTo(-15, -6);
                ctx.lineTo(-20, -12);
                ctx.lineTo(-10, -6);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-15, 6);
                ctx.lineTo(-20, 12);
                ctx.lineTo(-10, 6);
                ctx.closePath();
                ctx.fill();
                
                // Llama del cohete
                const flameGradient = ctx.createLinearGradient(-15, 0, -30, 0);
                flameGradient.addColorStop(0, '#FF6B35');
                flameGradient.addColorStop(0.5, '#FFD700');
                flameGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                ctx.fillStyle = flameGradient;
                ctx.beginPath();
                ctx.moveTo(-15, -4);
                ctx.lineTo(-30 - Math.random() * 10, 0);
                ctx.lineTo(-15, 4);
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
                break;
                
            case 'cannonball':
                // Bola de cañón
                const gradient = ctx.createRadialGradient(p.x - 3, p.y - 3, 0, p.x, p.y, 14);
                gradient.addColorStop(0, '#666');
                gradient.addColorStop(0.5, '#333');
                gradient.addColorStop(1, '#111');
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Brillo metálico
                ctx.beginPath();
                ctx.arc(p.x - 4, p.y - 4, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fill();
                
                // Borde
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
                
            case 'sniper':
                // Bala de francotirador (veloz, brillante)
                const bulletAngle = Math.atan2(p.vy, p.vx);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(bulletAngle);
                
                // Estela brillante
                const sniperGradient = ctx.createLinearGradient(-20, 0, 5, 0);
                sniperGradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
                sniperGradient.addColorStop(1, '#FFD700');
                ctx.fillStyle = sniperGradient;
                ctx.fillRect(-20, -2, 25, 4);
                
                // Bala dorada
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Brillo
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.ellipse(-1, -1, 2, 1, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
                break;
                
            case 'shotgun':
                // Perdigones múltiples
                for (let i = 0; i < 5; i++) {
                    const offsetX = (Math.random() - 0.5) * 15;
                    const offsetY = (Math.random() - 0.5) * 15;
                    ctx.beginPath();
                    ctx.arc(p.x + offsetX, p.y + offsetY, 3, 0, Math.PI * 2);
                    ctx.fillStyle = '#FFA500';
                    ctx.fill();
                }
                break;
                
            default:
                // Bala normal
                const normalGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
                normalGradient.addColorStop(0, '#FFFFFF');
                normalGradient.addColorStop(0.3, '#FFD54F');
                normalGradient.addColorStop(0.6, '#FF9800');
                normalGradient.addColorStop(1, '#F44336');
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = normalGradient;
                ctx.fill();
                
                // Brillo
                ctx.beginPath();
                ctx.arc(p.x - 2, p.y - 2, 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
        }
    }
    
    // ============================================================
    // DIBUJAR TRAYECTORIA PREVIEW (línea punteada parabólica)
    // ============================================================
    this.dibujarTrayectoriaPreview = function(ctx, entidad, angulo, potencia, viento) {
        const x = entidad.x;
        const y = entidad.y - 50; // Desde la torreta
        
        const rad = angulo * (Math.PI / 180);
        const velocidad = potencia * 0.15;
        let vx = Math.cos(-rad) * velocidad;
        let vy = Math.sin(-rad) * velocidad;
        
        const gravity = 0.15;
        const windEffect = (viento || 0) * 0.02;
        
        const puntos = [];
        let px = x + Math.cos(-rad) * 50;
        let py = y + Math.sin(-rad) * 50;
        
        // Simular trayectoria
        for (let i = 0; i < 80; i++) {
            puntos.push({ x: px, y: py });
            vx += windEffect;
            vy += gravity;
            px += vx;
            py += vy;
            
            // Parar si sale de la pantalla
            if (py > this.shooterGame.canvas.height - 50 || px < 0 || px > this.shooterGame.canvas.width) {
                break;
            }
        }
        
        // Dibujar línea punteada
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i < puntos.length; i++) {
            const alpha = 1 - i / puntos.length;
            if (i === 0) {
                ctx.moveTo(puntos[i].x, puntos[i].y);
            } else {
                ctx.lineTo(puntos[i].x, puntos[i].y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Puntos de referencia
        for (let i = 0; i < puntos.length; i += 10) {
            const alpha = 1 - i / puntos.length;
            ctx.beginPath();
            ctx.arc(puntos[i].x, puntos[i].y, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.8})`;
            ctx.fill();
        }
        
        // Punto de impacto estimado
        if (puntos.length > 1) {
            const ultimo = puntos[puntos.length - 1];
            ctx.beginPath();
            ctx.arc(ultimo.x, ultimo.y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // X en el punto de impacto
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ultimo.x - 6, ultimo.y - 6);
            ctx.lineTo(ultimo.x + 6, ultimo.y + 6);
            ctx.moveTo(ultimo.x + 6, ultimo.y - 6);
            ctx.lineTo(ultimo.x - 6, ultimo.y + 6);
            ctx.stroke();
        }
    }

    this.dibujarEntidadShooter = function(ctx, entidad, color, esJugador) {
        if (!entidad || !entidad.tropa) {
            console.error("Entidad inválida para dibujar");
            return;
        }
        
        const x = entidad.x;
        const y = entidad.y;
        const altura = entidad.agachado ? 45 : 65;
        const ancho = 35;
        const dir = entidad.direccion;
        
        // ========== SOMBRA DINÁMICA ==========
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, ancho * 0.8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // ========== EFECTO DE ULTIMATE ACTIVO ==========
        if (entidad.ultimateActivo) {
            // Aura brillante
            const auraGradient = ctx.createRadialGradient(x, y - altura/2, 10, x, y - altura/2, 60);
            auraGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
            auraGradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.2)');
            auraGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = auraGradient;
            ctx.beginPath();
            ctx.arc(x, y - altura/2, 60, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // ========== BOTAS / PIES ==========
        ctx.fillStyle = '#1a1a1a';
        // Pie izquierdo
        ctx.beginPath();
        ctx.ellipse(x - 10, y + 2, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pie derecho
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 2, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // ========== PIERNAS ==========
        ctx.fillStyle = '#2d2d2d';
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        // Pierna izquierda
        ctx.fillRect(x - 14, y - 25, 10, 28);
        ctx.strokeRect(x - 14, y - 25, 10, 28);
        // Pierna derecha
        ctx.fillRect(x + 4, y - 25, 10, 28);
        ctx.strokeRect(x + 4, y - 25, 10, 28);
        
        // ========== CUERPO / TORSO ==========
        // Cuerpo principal con gradiente
        const bodyGradient = ctx.createLinearGradient(x - ancho/2, y - altura, x + ancho/2, y - 25);
        bodyGradient.addColorStop(0, color);
        bodyGradient.addColorStop(0.5, this.ajustarBrillo(color, 1.2));
        bodyGradient.addColorStop(1, this.ajustarBrillo(color, 0.8));
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(x - ancho/2, y - 25);
        ctx.lineTo(x - ancho/2 - 3, y - altura + 10);
        ctx.quadraticCurveTo(x, y - altura - 5, x + ancho/2 + 3, y - altura + 10);
        ctx.lineTo(x + ancho/2, y - 25);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.ajustarBrillo(color, 0.6);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Detalle del chaleco/armadura
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.moveTo(x - 5, y - altura + 15);
        ctx.lineTo(x, y - 30);
        ctx.lineTo(x + 5, y - altura + 15);
        ctx.closePath();
        ctx.fill();
        
        // ========== BRAZOS ==========
        ctx.fillStyle = this.ajustarBrillo(color, 0.9);
        ctx.strokeStyle = this.ajustarBrillo(color, 0.5);
        ctx.lineWidth = 1;
        
        // Brazo trasero
        ctx.fillRect(x - dir * 18, y - altura + 15, 8, 25);
        
        // Brazo delantero (sostiene el arma)
        const brazoX = x + dir * 12;
        ctx.fillRect(brazoX, y - altura + 12, 8, 28);
        
        // ========== ARMA ACTUAL ==========
        const arma = entidad.tropa.armas[entidad.armaActual];
        const armaX = x + dir * 25;
        const armaY = y - altura / 2 - 5;
        
        // Cuerpo del arma
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        
        // Base del arma
        ctx.fillRect(x + dir * 15, armaY - 4, dir * 35, 10);
        ctx.strokeRect(x + dir * 15, armaY - 4, dir * 35, 10);
        
        // Cañón
        ctx.fillStyle = '#444';
        ctx.fillRect(x + dir * 45, armaY - 2, dir * 15, 6);
        
        // Detalles del arma
        ctx.fillStyle = '#555';
        ctx.fillRect(x + dir * 20, armaY - 6, dir * 8, 4);
        
        // Mira
        ctx.fillStyle = esJugador ? '#4CAF50' : '#f44336';
        ctx.beginPath();
        ctx.arc(x + dir * 55, armaY + 1, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // ========== CABEZA ==========
        // Cuello
        ctx.fillStyle = '#DDBEA0';
        ctx.fillRect(x - 6, y - altura - 5, 12, 10);
        
        // Cabeza principal
        const headGradient = ctx.createRadialGradient(x - 3, y - altura - 18, 5, x, y - altura - 15, 18);
        headGradient.addColorStop(0, '#FFE4C4');
        headGradient.addColorStop(1, '#DDBEA0');
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.arc(x, y - altura - 15, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#C9A882';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // ========== CASCO / GORRO ==========
        ctx.fillStyle = esJugador ? '#2E7D32' : '#B71C1C';
        ctx.beginPath();
        ctx.arc(x, y - altura - 18, 17, Math.PI, 0, false);
        ctx.lineTo(x + 17, y - altura - 15);
        ctx.lineTo(x - 17, y - altura - 15);
        ctx.closePath();
        ctx.fill();
        
        // Visera del casco
        ctx.fillStyle = esJugador ? '#1B5E20' : '#7F0000';
        ctx.beginPath();
        ctx.ellipse(x + dir * 3, y - altura - 15, 18, 5, 0, 0, Math.PI);
        ctx.fill();
        
        // ========== CARA ==========
        // Ojo
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x + dir * 5, y - altura - 16, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupila (mira hacia donde apunta)
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x + dir * 6, y - altura - 16, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Brillo del ojo
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + dir * 5, y - altura - 17, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Ceja
        ctx.strokeStyle = '#4a3728';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + dir * 1, y - altura - 22);
        ctx.lineTo(x + dir * 9, y - altura - 20);
        ctx.stroke();
        
        // Boca (expresión según vida)
        const vidaPct = entidad.vida / entidad.vidaMax;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (vidaPct > 0.5) {
            // Sonrisa
            ctx.arc(x + dir * 2, y - altura - 8, 5, 0.1 * Math.PI, 0.9 * Math.PI, false);
        } else if (vidaPct > 0.25) {
            // Neutral
            ctx.moveTo(x + dir * -2, y - altura - 7);
            ctx.lineTo(x + dir * 6, y - altura - 7);
        } else {
            // Preocupado
            ctx.arc(x + dir * 2, y - altura - 5, 5, 1.1 * Math.PI, 1.9 * Math.PI, false);
        }
        ctx.stroke();
        
        // ========== EMOJI DE TROPA ==========
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(entidad.tropa.emoji, x, y - altura - 50);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // ========== NOMBRE DEL ARMA ACTUAL ==========
        if (esJugador && arma) {
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillText(arma.nombre, x, y - altura - 70);
        }
        
        // ========== BARRA DE VIDA ÉPICA ==========
        const barraAncho = 60;
        const barraAlto = 10;
        const barraX = x - barraAncho/2;
        const barraY = y - altura - 85;
        
        // Fondo de la barra
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barraX - 2, barraY - 2, barraAncho + 4, barraAlto + 4);
        
        // Barra interior (fondo)
        ctx.fillStyle = '#333';
        ctx.fillRect(barraX, barraY, barraAncho, barraAlto);
        
        // Vida actual con gradiente
        const vidaGradient = ctx.createLinearGradient(barraX, barraY, barraX + barraAncho * vidaPct, barraY);
        if (vidaPct > 0.5) {
            vidaGradient.addColorStop(0, '#4CAF50');
            vidaGradient.addColorStop(1, '#8BC34A');
        } else if (vidaPct > 0.25) {
            vidaGradient.addColorStop(0, '#FF9800');
            vidaGradient.addColorStop(1, '#FFC107');
        } else {
            vidaGradient.addColorStop(0, '#f44336');
            vidaGradient.addColorStop(1, '#FF5722');
        }
        ctx.fillStyle = vidaGradient;
        ctx.fillRect(barraX, barraY, barraAncho * vidaPct, barraAlto);
        
        // Brillo de la barra
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(barraX, barraY, barraAncho * vidaPct, barraAlto / 2);
        
        // Borde de la barra
        ctx.strokeStyle = esJugador ? '#4CAF50' : '#f44336';
        ctx.lineWidth = 2;
        ctx.strokeRect(barraX, barraY, barraAncho, barraAlto);
        
        // Texto de vida
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(entidad.vida)}/${entidad.vidaMax}`, x, barraY + barraAlto + 12);
    }
    
    // Función auxiliar para ajustar brillo de colores
    this.ajustarBrillo = function(color, factor) {
        // Convertir color hex a RGB y ajustar
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else {
            return color;
        }
        
        r = Math.min(255, Math.max(0, Math.round(r * factor)));
        g = Math.min(255, Math.max(0, Math.round(g * factor)));
        b = Math.min(255, Math.max(0, Math.round(b * factor)));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Función para dibujar nubes
    this.dibujarNube = function(ctx, x, y, tamaño) {
        ctx.beginPath();
        ctx.arc(x, y, tamaño * 0.5, 0, Math.PI * 2);
        ctx.arc(x + tamaño * 0.4, y - tamaño * 0.2, tamaño * 0.4, 0, Math.PI * 2);
        ctx.arc(x + tamaño * 0.8, y, tamaño * 0.35, 0, Math.PI * 2);
        ctx.arc(x + tamaño * 0.4, y + tamaño * 0.1, tamaño * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    this.mostrarMenuPausaShooter= function() {
        const game = this.shooterGame;
        
        const html = `
            <div style="text-align: center; padding: 30px;">
                <h2>⏸️ JUEGO PAUSADO</h2>
                <div style="margin: 30px 0;">
                    <button class="btn btn-success btn-lg mb-2" onclick="$('#miModal').modal('hide');">
                        ▶️ Continuar
                    </button>
                    <br>
                    <button class="btn btn-danger mt-2" onclick="cw.salirShooter();">
                        🚪 Abandonar Partida
                    </button>
                </div>
            </div>
        `;
        
        this.mostrarModal(html);
    }
    
    this.finalizarShooter = function(resultado) {
        const game = this.shooterGame;
        game.activo = false;
        
        if (game.animationFrame) {
            cancelAnimationFrame(game.animationFrame);
        }
        
        const stats = game.jugador.stats;
        const precision = stats.disparos > 0 ? Math.round((stats.impactos / stats.disparos) * 100) : 0;
        const turnos = game.turnoNumero;
        
        // ============ CALCULAR RECOMPENSAS ============
        // Base según resultado
        let monedas = resultado === 'victoria' ? 500 : 100;
        let exp = resultado === 'victoria' ? 200 : 50;
        let copas = resultado === 'victoria' ? 30 : -10;
        
        // Bonus por precisión
        let bonusPrecision = 0;
        if (precision > 80) {
            bonusPrecision = 300;
            monedas += bonusPrecision;
            exp += 150;
        } else if (precision > 60) {
            bonusPrecision = 150;
            monedas += bonusPrecision;
            exp += 75;
        } else if (precision > 40) {
            bonusPrecision = 50;
            monedas += bonusPrecision;
            exp += 25;
        }
        
        // Bonus por victoria rápida (menos turnos)
        let bonusRapido = 0;
        if (resultado === 'victoria' && turnos <= 4) {
            bonusRapido = 200;
            monedas += bonusRapido;
            exp += 100;
        } else if (resultado === 'victoria' && turnos <= 6) {
            bonusRapido = 100;
            monedas += bonusRapido;
            exp += 50;
        }
        
        // Bonus por daño hecho
        let bonusDaño = Math.floor(stats.dañoHecho / 10) * 5;
        monedas += bonusDaño;
        exp += Math.floor(bonusDaño / 2);
        
        // Aplicar recompensas
        const datosAntes = {
            nivel: this.datosJugador.nivel || 1,
            exp: this.datosJugador.experiencia || 0,
            copas: this.datosJugador.copas || 0
        };
        
        this.datosJugador.monedas = (this.datosJugador.monedas || 0) + monedas;
        this.datosJugador.experiencia = (this.datosJugador.experiencia || 0) + exp;
        this.datosJugador.copas = Math.max(0, (this.datosJugador.copas || 0) + copas);
        
        // Sistema de niveles
        const expParaNivel = (nivel) => nivel * 500 + (nivel - 1) * 250;
        let nivelActual = this.datosJugador.nivel || 1;
        let expActual = this.datosJugador.experiencia;
        let subioNivel = false;
        
        while (expActual >= expParaNivel(nivelActual)) {
            expActual -= expParaNivel(nivelActual);
            nivelActual++;
            subioNivel = true;
            // Bonus por subir de nivel
            this.datosJugador.monedas += 1000;
        }
        
        this.datosJugador.nivel = nivelActual;
        this.datosJugador.experiencia = expActual;
        
        // Calcular progreso XP
        const expNecesaria = expParaNivel(nivelActual);
        const progresoPct = Math.round((expActual / expNecesaria) * 100);
        
        this.actualizarMonedas();
        this.guardarProgreso();
        
        // ============ PANTALLA DE RESULTADOS ============
        const htmlFin = `
            <div class="shooter-end-overlay">
                <div class="shooter-end-screen ${resultado}">
                    <!-- Resultado Principal -->
                    <div class="end-result-banner ${resultado}">
                        <span class="result-icon">${resultado === 'victoria' ? '🏆' : '💀'}</span>
                        <span class="result-text">${resultado === 'victoria' ? '¡VICTORIA!' : 'DERROTA'}</span>
                    </div>
                    
                    <!-- Stats de la partida -->
                    <div class="end-stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">💥</div>
                            <div class="stat-value">${stats.dañoHecho}</div>
                            <div class="stat-label">Daño</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🎯</div>
                            <div class="stat-value">${precision}%</div>
                            <div class="stat-label">Precisión</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">🔫</div>
                            <div class="stat-value">${stats.disparos}</div>
                            <div class="stat-label">Disparos</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon">⏱️</div>
                            <div class="stat-value">${turnos}</div>
                            <div class="stat-label">Turnos</div>
                        </div>
                    </div>
                    
                    <!-- Recompensas -->
                    <div class="end-rewards">
                        <h3 class="rewards-title">🎁 Recompensas</h3>
                        <div class="rewards-grid">
                            <div class="reward-item gold">
                                <span class="reward-icon">💰</span>
                                <span class="reward-value">+${monedas}</span>
                                ${bonusPrecision > 0 ? `<span class="reward-bonus">+${bonusPrecision} precisión</span>` : ''}
                                ${bonusRapido > 0 ? `<span class="reward-bonus">+${bonusRapido} rápido</span>` : ''}
                            </div>
                            <div class="reward-item xp">
                                <span class="reward-icon">⭐</span>
                                <span class="reward-value">+${exp} XP</span>
                            </div>
                            <div class="reward-item trophies ${copas < 0 ? 'negative' : ''}">
                                <span class="reward-icon">🏆</span>
                                <span class="reward-value">${copas > 0 ? '+' : ''}${copas}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Barra de XP -->
                    <div class="end-xp-section">
                        <div class="xp-level-display">
                            <div class="level-badge">Nv. ${nivelActual}</div>
                            <div class="xp-bar-container">
                                <div class="xp-bar">
                                    <div class="xp-fill" style="width: ${progresoPct}%"></div>
                                </div>
                                <div class="xp-text">${expActual} / ${expNecesaria} XP</div>
                            </div>
                        </div>
                        ${subioNivel ? `
                            <div class="level-up-notice">
                                🎉 ¡SUBISTE A NIVEL ${nivelActual}! 🎉
                                <div class="level-up-reward">+1000 💰 Bonus</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Copas totales -->
                    <div class="end-trophies-total">
                        <span class="trophy-icon">🏆</span>
                        <span class="trophy-count">${this.datosJugador.copas}</span>
                        <span class="trophy-label">Copas Totales</span>
                    </div>
                    
                    <!-- Botones -->
                    <div class="end-buttons">
                        <button class="btn-end btn-rematch" onclick="cw.revancharShooter()">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">Revancha</span>
                        </button>
                        <button class="btn-end btn-menu" onclick="cw.salirShooter()">
                            <span class="btn-icon">🏠</span>
                            <span class="btn-text">Menú</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('#canvasContainer').append(htmlFin);
        
        // Animar entrada
        setTimeout(() => {
            $('.shooter-end-overlay').addClass('show');
        }, 100);
    }
    
    this.revancharShooter = function() {
        const game = this.shooterGame;
        const tropaId = game.jugador.tropa.id;
        const mapaId = game.mapa.id;
        
        this.salirShooter();
        setTimeout(() => {
            this.iniciarJuegoShooter('tierra', tropaId, mapaId, 'ia');
        }, 100);
    }
    
    this.salirShooter = function() {
        const game = this.shooterGame;
        
        if (game) {
            game.activo = false;
            if (game.animationFrame) {
                cancelAnimationFrame(game.animationFrame);
            }
        }
        
        // Quitar eventos
        $(document).off('.shooter');
        $('#shooterCanvas').off('.shooter');
        
        // Quitar interfaz
        $('#shooterArena').remove();
        $('.damage-indicator').remove();
        $('#miModal').modal('hide');
        
        // Restaurar elementos de UI ocultos
        $('.game-container').show();
        $('#googleSigninContainer').show();
        $('#rankingPanel').show();
        $('#profileIcon').show();
        
        this.shooterGame = null;
        
        // Volver al menú
        this.mostrarPanelShooterTierra();
    }
    
    // ==========================================
    // SHOOTER MULTIJUGADOR - SINCRONIZACIÓN
    // ==========================================
    
    // Extender shooterGame con métodos de sincronización
    this.sincronizarPosicionMulti = function() {
        const game = this.shooterGame;
        if (!game || game.modo !== 'multi') return;
        
        // Enviar posición cada 50ms aprox (throttled en el game loop)
        if (ws && ws.socket) {
            ws.enviarPosicion(
                game.jugador.x,
                game.jugador.y,
                game.jugador.direccion
            );
        }
    }
    
    // Estas funciones son llamadas desde clienteWS cuando llega info del rival
    
    this.actualizarPosicionRival = function(datos) {
        if (!this.shooterGame || this.shooterGame.modo !== 'multi') return;
        
        // Interpolar suavemente hacia la posición del rival
        const enemigo = this.shooterGame.enemigo;
        if (enemigo) {
            enemigo.x = datos.x;
            enemigo.y = datos.y;
            enemigo.direccion = datos.direccion;
        }
    }
    
    this.recibirDisparoRival = function(datos) {
        if (!this.shooterGame || this.shooterGame.modo !== 'multi') return;
        
        const game = this.shooterGame;
        const enemigo = game.enemigo;
        if (!enemigo || !enemigo.tropa) return;
        
        const arma = enemigo.tropa.armas.find(a => a.id === datos.armaId) || enemigo.tropa.armas[0];
        
        // Crear proyectil del rival
        game.proyectiles.push({
            x: datos.x,
            y: datos.y,
            vx: datos.direccion * arma.proyectilVelocidad,
            vy: 0,
            daño: arma.daño,
            alcance: arma.alcance,
            distRecorrida: 0,
            propietario: 'enemigo',
            tipo: arma.tipo || 'bala',
            color: '#FF4444',
            tamaño: arma.tamañoProyectil || 5
        });
    }
    
    this.recibirDanioMulti = function(datos) {
        if (!this.shooterGame) return;
        
        const game = this.shooterGame;
        game.jugador.vida = Math.max(0, game.jugador.vida - datos.cantidad);
        
        this.mostrarIndicadorDaño(game.jugador.x, game.jugador.y - 40, datos.cantidad);
        
        if (game.jugador.vida <= 0) {
            this.finalizarShooter('derrota');
        }
    }
    
    this.recibirUltimateRival = function(datos) {
        if (!this.shooterGame || this.shooterGame.modo !== 'multi') return;
        
        this.shooterGame.enemigo.ultimateActivo = true;
        this.mostrarMensaje('🔥 ¡El rival activó su DEFINITIVA!');
        
        setTimeout(() => {
            if (this.shooterGame && this.shooterGame.enemigo) {
                this.shooterGame.enemigo.ultimateActivo = false;
            }
        }, 5000);
    }
    
    this.detenerShooterGame = function() {
        if (!this.shooterGame) return;
        
        this.shooterGame.activo = false;
        if (this.shooterGame.animationFrame) {
            cancelAnimationFrame(this.shooterGame.animationFrame);
        }
    }

    // ==========================================
    // PANEL MULTIJUGADOR
    // ==========================================
    
    this.mostrarPanelMultijugadorDominio = function(dominio) {
        this.limpiar();
        const data = this.unidadesAtaque[dominio];
        const esShooter = data && data.tipoJuego === 'shooter';
        
        const temaClases = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };

        const bgClases = {
            tierra: 'domain-bg-tierra',
            mar: 'domain-bg-mar',
            aire: 'domain-bg-aire'
        };

        this.setDomainBackground(bgClases[dominio]);
        this.dominioActual = dominio;
        
        const nombreDominio = dominio === 'tierra' ? 'Terrestre' : dominio === 'mar' ? 'Naval' : 'Aéreo';
        
        // Determinar el modo de juego según el dominio
        const gameModes = {
            tierra: 'tankStars',
            mar: 'batallaNaval',
            aire: 'spaceInvaders'
        };
        const gameMode = gameModes[dominio];
        
        const panel = `
            <div class="game-panel ${temaClases[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">${data.emoji} Multijugador - ${nombreDominio}</h2>
                    <button class="btn-back" id="btnVolverDominio">← Volver</button>
                </div>
                
                <div class="matches-section">
                    <div class="match-actions" style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                        <button class="btn-create-match" id="btnCrearRoom" style="flex: 1; max-width: 200px;">
                            ⚔️ Crear Partida
                        </button>
                    </div>
                    
                    <div class="join-match-group" style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
                        <input type="text" class="game-input" id="codigoRoom" placeholder="Código de sala..." 
                               style="flex: 1; max-width: 200px; padding: 12px; border-radius: 8px; border: none; text-transform: uppercase;">
                        <button class="btn-action btn-join" id="btnUnirRoom" style="padding: 12px 25px;">Unirse</button>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 15px;">
                        <button class="btn-refresh" id="btnRefreshRooms" style="background: rgba(255,255,255,0.1); border: none; padding: 10px 20px; border-radius: 5px; color: #fff; cursor: pointer;">
                            🔄 Actualizar Lista
                        </button>
                    </div>
                    
                    <h5 class="section-title" style="margin-top: 20px; color: #aaa;">📋 Salas Disponibles</h5>
                    <div class="matches-list" id="listaRooms" style="max-height: 300px; overflow-y: auto;">
                        <p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">
                            Buscando salas...
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        this.dominioMultijugador = dominio;
        
        $("#btnVolverDominio").on("click", () => cw.mostrarMenuDominio(dominio));
        
        // Crear partida con nuevo sistema de Rooms
        $("#btnCrearRoom").on("click", function() {
            let nick = $.cookie("nick");
            if (nick && ws) {
                ws.crearRoom(gameMode, dominio);
            } else {
                cw.mostrarModal("Debes iniciar sesión.");
            }
        });
        
        // Unirse con código
        $("#btnUnirRoom").on("click", function() {
            let codigo = $("#codigoRoom").val().toUpperCase().trim();
            if (codigo && ws) {
                ws.unirRoom(codigo);
            } else {
                cw.mostrarModal("Introduce un código válido.");
            }
        });
        
        // Refrescar lista
        $("#btnRefreshRooms").on("click", function() {
            if (ws) {
                ws.obtenerRooms(gameMode, dominio);
            }
        });
        
        // Pedir lista inicial
        if (ws && ws.socket) {
            ws.obtenerRooms(gameMode, dominio);
        }
    }
    
    // ==========================================
    // MULTIJUGADOR SHOOTER - SELECCIÓN DE MAPA (CREADOR)
    // ==========================================
    
    this.mostrarSeleccionMapaMulti = function(dominio) {
        dominio = dominio || this.dominioActual || 'tierra';
        this.limpiar();
        const mapas = this.mapasShooter[dominio] || [];
        
        // Solo mostrar mapas desbloqueados
        const mapasDisponibles = mapas.filter(m => 
            m.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(m.id)
        );
        
        const temas = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };
        
        const html = `
            <div class="game-panel ${temas[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">🗺️ Selecciona el Mapa</h2>
                    <button class="btn-back" id="btnVolverMulti">← Volver</button>
                </div>
                
                <p style="color: #aaa; text-align: center; margin-bottom: 20px;">
                    Elige el campo de batalla para el duelo
                </p>
                
                <div class="mapas-selection-grid">
                    ${mapasDisponibles.map(mapa => `
                        <div class="mapa-select-card rareza-${mapa.rareza.toLowerCase()}" 
                             data-mapa="${mapa.id}" onclick="cw.seleccionarMapaMulti('${mapa.id}', '${dominio}')">
                            <div class="mapa-emoji">${mapa.emoji}</div>
                            <div class="mapa-nombre">${mapa.nombre}</div>
                            <div class="mapa-rareza">${mapa.rareza}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="multi-actions" style="text-align: center; margin-top: 30px;">
                    <button class="btn-iniciar-combate ${dominio}" id="btnConfirmarMapa" disabled>
                        ✅ Confirmar y Crear Partida
                    </button>
                    <p id="mapaSeleccionadoInfo" style="color: #888; margin-top: 10px;">
                        Selecciona un mapa
                    </p>
                </div>
            </div>
        `;
        
        $("#au").html(html);
        
        this.mapaMultiSeleccionado = null;
        this.dominioMulti = dominio;
        
        $("#btnVolverMulti").on("click", function() {
            cw.mostrarPanelMultijugadorDominio(dominio);
        });
        
        $("#btnConfirmarMapa").on("click", function() {
            console.log("Click en confirmar mapa, seleccionado:", cw.mapaMultiSeleccionado);
            if (cw.mapaMultiSeleccionado && ws) {
                console.log("Creando partida shooter con mapa:", cw.mapaMultiSeleccionado);
                ws.crearPartidaShooter(cw.mapaMultiSeleccionado, dominio);
            } else {
                console.log("No se puede crear: mapa=", cw.mapaMultiSeleccionado, "ws=", ws);
                if (!ws) {
                    cw.mostrarModal("Error de conexión. Recarga la página.");
                }
            }
        });
    }
    
    this.seleccionarMapaMulti = function(mapaId, dominio) {
        dominio = dominio || this.dominioMulti || 'tierra';
        const mapas = this.mapasShooter[dominio] || [];
        const mapa = mapas.find(m => m.id === mapaId);
        if (!mapa) return;
        
        // Verificar si el mapa está desbloqueado
        const desbloqueado = mapa.desbloqueado || 
            this.datosJugador.mapasDesbloqueados?.includes(mapaId);
        
        if (!desbloqueado) {
            this.mostrarMensaje(`🔒 Debes comprar el mapa "${mapa.nombre}" primero en la tienda`);
            return;
        }
        
        $('.mapa-select-card').removeClass('seleccionado');
        $(`.mapa-select-card[data-mapa="${mapaId}"]`).addClass('seleccionado');
        
        this.mapaMultiSeleccionado = mapaId;
        
        // Habilitar el botón - usar removeAttr para asegurar que funcione
        $('#btnConfirmarMapa').removeAttr('disabled').prop('disabled', false);
        $('#mapaSeleccionadoInfo').html(`<span style="color: #4CAF50;">✅ ${mapa.emoji} ${mapa.nombre}</span>`);
        
        console.log("Mapa seleccionado:", mapaId, "Botón habilitado:", !$('#btnConfirmarMapa').prop('disabled'));
    }

    // ==========================================
    // PANTALLA DE ESPERA (CREADOR)
    // ==========================================
    
    this.mostrarEsperandoRivalShooter = function(mapaId, dominio) {
        dominio = dominio || this.dominioMulti || 'tierra';
        this.limpiar();
        const mapas = this.mapasShooter[dominio] || [];
        const mapa = mapas.find(m => m.id === mapaId);
        
        const temas = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };
        
        const waiting = `
            <div class="game-panel ${temas[dominio]}">
                <div class="waiting-screen">
                    <h3 class="waiting-title">⏳ Esperando Rival...</h3>
                    <div class="spinner"></div>
                    <div class="waiting-code">${ws.codigo || '???'}</div>
                    <p style="color: var(--color-plata);">Comparte este código con tu rival</p>
                    
                    <div style="margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                        <p style="color: #888; margin-bottom: 10px;">Mapa seleccionado:</p>
                        <div style="font-size: 2rem;">${mapa ? mapa.emoji : '🗺️'}</div>
                        <div style="color: #fff; font-weight: 700;">${mapa ? mapa.nombre : 'Desconocido'}</div>
                    </div>
                    
                    <button class="btn-back" id="btnCancelarPartida" style="margin-top: 20px;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        $("#au").html(waiting);
        
        this.partidaShooterData = {
            mapaId: mapaId,
            esHost: true,
            tropaSeleccionada: null,
            dominio: dominio
        };
        
        $("#btnCancelarPartida").on("click", function() {
            ws.salirPartida();
            cw.mostrarPanelMultijugadorDominio(dominio);
        });
    }

    // ==========================================
    // PANTALLA DE SELECCIÓN DE PERSONAJE (AMBOS JUGADORES)
    // ==========================================
    
    this.mostrarSeleccionPersonajeMulti = function(mapaId, esHost, rivalNick, dominio) {
        console.log("🎯 mostrarSeleccionPersonajeMulti llamado - esHost:", esHost, "rivalNick:", rivalNick, "dominio:", dominio);
        dominio = dominio || this.dominioMulti || 'tierra';
        this.limpiar();
        
        const mapas = this.mapasShooter[dominio] || [];
        const mapa = mapas.find(m => m.id === mapaId);
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        
        // Tropas disponibles (desbloqueadas)
        const tropasDisponibles = tropas.filter(t => 
            t.desbloqueado || this.datosJugador.tropasDesbloqueadas?.[t.id]
        );
        
        const temas = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };
        
        const nombreUnidad = dominio === 'tierra' ? 'Soldado' : dominio === 'mar' ? 'Nave' : 'Aeronave';
        
        const html = `
            <div class="game-panel ${temas[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">🎯 Elige tu ${nombreUnidad}</h2>
                </div>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; display: inline-block;">
                        <span style="color: #888;">Mapa:</span>
                        <span style="font-size: 1.5rem; margin: 0 10px;">${mapa ? mapa.emoji : '🗺️'}</span>
                        <span style="color: #fff; font-weight: 700;">${mapa ? mapa.nombre : 'Desconocido'}</span>
                    </div>
                    <p style="color: #aaa; margin-top: 10px;">⚔️ vs ${rivalNick || 'Rival'}</p>
                </div>
                
                <div class="tropas-selection-grid" style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                    ${tropasDisponibles.map(tropa => `
                        <div class="tropa-select-card rareza-${tropa.rareza.toLowerCase()}" 
                             data-tropa="${tropa.id}" onclick="cw.seleccionarTropaMulti('${tropa.id}', '${dominio}')">
                            <div class="tropa-emoji" style="font-size: 3rem;">${tropa.emoji}</div>
                            <div class="tropa-nombre" style="font-weight: 700; margin: 10px 0;">${tropa.nombre}</div>
                            <div class="tropa-stats" style="color: #aaa; font-size: 0.9rem;">
                                ❤️${tropa.stats.vida} ⚡${tropa.stats.velocidad}
                            </div>
                            <div class="tropa-armas" style="margin-top: 10px; font-size: 0.8rem; color: #888;">
                                ${tropa.armas.map(a => a.emoji).join(' ')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${tropasDisponibles.length === 0 ? `
                    <p style="text-align: center; color: #f44336;">
                        ⚠️ No tienes ${nombreUnidad.toLowerCase()}s desbloqueados. Compra uno en la tienda.
                    </p>
                ` : ''}
                
                <div class="multi-actions" style="text-align: center; margin-top: 30px;">
                    <button class="btn-iniciar-combate ${dominio}" id="btnConfirmarTropa" disabled>
                        ⚔️ ¡LISTO PARA EL COMBATE!
                    </button>
                    <p id="tropaSeleccionadaInfo" style="color: #888; margin-top: 10px;">
                        Selecciona tu ${nombreUnidad.toLowerCase()}
                    </p>
                    <div id="estadoRival" style="margin-top: 15px; color: #ff9800;">
                        ⏳ Esperando que el rival elija...
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(html);
        
        this.partidaShooterData = {
            mapaId: mapaId,
            esHost: esHost,
            tropaSeleccionada: null,
            rivalNick: rivalNick,
            rivalListo: false,
            miListo: false,
            dominio: dominio
        };
        
        $("#btnConfirmarTropa").on("click", () => {
            if (this.partidaShooterData.tropaSeleccionada) {
                this.confirmarTropaMulti();
            }
        });
    }
    
    this.seleccionarTropaMulti = function(tropaId, dominio) {
        dominio = dominio || this.partidaShooterData?.dominio || 'tierra';
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const tropa = tropas.find(t => t.id === tropaId);
        if (!tropa) return;
        
        // Verificar si la tropa está desbloqueada
        const desbloqueada = tropa.desbloqueado || 
            this.datosJugador.tropasDesbloqueadas?.[tropaId];
        
        if (!desbloqueada) {
            this.mostrarMensaje(`🔒 Debes comprar "${tropa.nombre}" primero en la tienda`);
            return;
        }
        
        $('.tropa-select-card').removeClass('seleccionado');
        $(`.tropa-select-card[data-tropa="${tropaId}"]`).addClass('seleccionado');
        
        this.partidaShooterData.tropaSeleccionada = tropaId;
        
        $('#btnConfirmarTropa').prop('disabled', false);
        $('#tropaSeleccionadaInfo').html(`<span style="color: #4CAF50;">✅ ${tropa.emoji} ${tropa.nombre}</span>`);
    }
    
    this.confirmarTropaMulti = function() {
        const data = this.partidaShooterData;
        if (!data || !data.tropaSeleccionada) return;
        
        // Evitar doble click
        if (data.miListo) return;
        
        data.miListo = true;
        $('#btnConfirmarTropa').prop('disabled', true).text('✅ ¡LISTO!');
        
        console.log("📤 Enviando jugadorListoShooter, codigo:", ws?.codigo);
        
        // Notificar al servidor
        if (ws && ws.socket && ws.codigo) {
            ws.socket.emit('jugadorListoShooter', {
                tropaId: data.tropaSeleccionada,
                codigo: ws.codigo
            });
        } else {
            console.error("❌ Error: No hay conexión WebSocket o código de partida");
        }
        
        // Si ambos están listos, iniciar el juego
        this.verificarInicioShooterMulti();
    }
    
    this.rivalListoShooter = function(tropaId) {
        console.log("📥 rivalListoShooter recibido, tropaId:", tropaId);
        
        if (!this.partidaShooterData) {
            console.error("❌ No hay partidaShooterData cuando llegó rivalListoShooter");
            return;
        }
        
        this.partidaShooterData.rivalListo = true;
        this.partidaShooterData.rivalTropa = tropaId;
        
        $('#estadoRival').html('<span style="color: #4CAF50;">✅ ¡Rival listo!</span>');
        
        this.verificarInicioShooterMulti();
    }
    
    this.verificarInicioShooterMulti = function() {
        const data = this.partidaShooterData;
        if (!data) {
            console.log("⏳ verificarInicioShooterMulti: No hay data");
            return;
        }
        
        console.log("🔍 verificarInicioShooterMulti - miListo:", data.miListo, "rivalListo:", data.rivalListo);
        
        if (data.miListo && data.rivalListo) {
            // Evitar iniciar múltiples veces
            if (data.juegoIniciado) {
                console.log("⚠️ Juego ya iniciado, ignorando");
                return;
            }
            data.juegoIniciado = true;
            
            console.log("🎮 ¡Ambos listos! Iniciando partida en 1 segundo...");
            $('#estadoRival').html('<span style="color: #FFD700;">🎮 ¡INICIANDO PARTIDA!</span>');
            $('#tropaSeleccionadaInfo').html('<span style="color: #FFD700;">🎮 ¡INICIANDO PARTIDA!</span>');
            
            setTimeout(() => {
                this.iniciarShooterMultijugador(data);
            }, 1500);
        } else {
            console.log("⏳ Esperando - miListo:", data.miListo, "rivalListo:", data.rivalListo);
        }
    }
    
    this.iniciarShooterMultijugador = function(data) {
        const dominio = data.dominio || 'tierra';
        
        // Iniciar el juego shooter en modo multijugador
        this.iniciarJuegoShooter(dominio, data.tropaSeleccionada, data.mapaId, 'multi');
        
        // Configurar datos del rival con su tropa real
        if (this.shooterGame && data.rivalTropa) {
            const tropasDisponibles = this.unidadesAtaque[dominio]?.tropas || [];
            const tropaRival = tropasDisponibles.find(t => t.id === data.rivalTropa);
            
            if (tropaRival) {
                this.shooterGame.enemigo.tropa = tropaRival;
                this.shooterGame.enemigo.vida = tropaRival.stats.vida;
                this.shooterGame.enemigo.vidaMax = tropaRival.stats.vida;
                this.shooterGame.enemigo.tipoVisual = this.getTipoVisual(tropaRival);
            }
            
            this.shooterGame.rivalNick = data.rivalNick;
            this.shooterGame.esHost = data.esHost;
            
            // El host empieza el juego, el otro espera
            if (data.esHost) {
                this.shooterGame.turno = 'jugador';
                this.shooterGame.fase = 'movimiento';
            } else {
                this.shooterGame.turno = 'enemigo';
                this.shooterGame.fase = 'esperandoRival';
                $('#turnIndicator').addClass('enemy').html('<span class="turn-text">⏳ TURNO ENEMIGO</span>');
                $('#controlsPanel').addClass('disabled');
                $('#moveControls').addClass('hidden');
                $('#aimControls').addClass('hidden');
            }
            
            // Actualizar HUD con los nombres
            $('.tank-player-panel.player .tank-name').text(this.shooterGame.jugador.tropa.nombre);
            $('.tank-player-panel.enemy .tank-name').text(data.rivalNick || this.shooterGame.enemigo.tropa.nombre);
            
            // Actualizar el avatar del enemigo
            $('.tank-player-panel.enemy .tank-avatar').text(this.shooterGame.enemigo.tropa.emoji);
        }
        
        console.log(`🎮 Multijugador iniciado - esHost: ${data.esHost}, turno: ${this.shooterGame.turno}`);
    }
    
    this.shooterMultiTerminado = function(datos) {
        // Partida terminada (el rival ganó o abandonó)
        this.detenerShooterGame();
        
        const gane = datos.ganador !== $.cookie('nick');
        
        this.mostrarModal(`
            <div style="text-align: center;">
                <h3>${gane ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}</h3>
                <p>Partida terminada</p>
                <button class="btn-action" onclick="cw.cerrarModal(); cw.mostrarMenuDominio('tierra');">
                    Continuar
                </button>
            </div>
        `);
    }
    
    // ==========================================
    // SINCRONIZACIÓN DE TURNOS MULTIJUGADOR
    // ==========================================
    
    // Recibir disparo del rival
    this.recibirDisparoTurnoRival = function(datos) {
        const game = this.shooterGame;
        if (!game || !game.activo) return;
        
        console.log("📥 Procesando disparo rival:", datos);
        
        // Actualizar posición del enemigo
        if (datos.posX !== undefined) {
            game.enemigo.x = game.mapa.config.ancho - datos.posX; // Espejo horizontal
        }
        
        // El rival disparó, simular su proyectil
        const enemigo = game.enemigo;
        const armaIdx = datos.armaId || 0;
        const arma = enemigo.tropa.armas[armaIdx] || enemigo.tropa.armas[0];
        
        // Usar el ángulo y potencia del rival (reflejado)
        const angulo = datos.angulo;
        const potencia = datos.potencia;
        const anguloRad = (angulo * Math.PI) / 180;
        const velocidadBase = potencia * 0.15;
        
        // Posición inicial del proyectil (desde el enemigo, disparando hacia nosotros)
        const tipoVisual = enemigo.tipoVisual || 'soldado';
        let startX, startY;
        
        if (tipoVisual === 'tanque') {
            const cañonLargo = 60;
            startX = enemigo.x + Math.cos(Math.PI + anguloRad) * cañonLargo;
            startY = enemigo.y - 55 + Math.sin(Math.PI + anguloRad) * cañonLargo;
        } else {
            const armaLargo = 45;
            startX = enemigo.x + Math.cos(Math.PI + anguloRad) * armaLargo;
            startY = enemigo.y - 55 + Math.sin(Math.PI + anguloRad) * armaLargo;
        }
        
        const proyectilVisual = this.getProyectilVisual(arma);
        
        game.proyectilActivo = {
            x: startX,
            y: startY,
            vx: Math.cos(Math.PI + anguloRad) * velocidadBase,
            vy: Math.sin(Math.PI + anguloRad) * velocidadBase,
            gravedad: 0.15,
            viento: game.viento * 0.02,
            daño: arma.daño,
            radio: arma.radioExplosion || 40,
            color: proyectilVisual.color,
            tipo: proyectilVisual.tipo,
            tamaño: proyectilVisual.tamaño,
            trail: [],
            propietario: 'enemigo',
            arma: arma
        };
        
        game.anguloEnemigo = angulo;
        game.fase = 'disparando';
        
        console.log(`🎯 Rival disparó! Ángulo: ${angulo}°, Potencia: ${potencia}%`);
    }
    
    // Recibir movimiento del rival
    this.recibirMovimientoRival = function(datos) {
        const game = this.shooterGame;
        if (!game) return;
        
        // Espejar la posición (el mapa es simétrico)
        game.enemigo.x = game.mapa.config.ancho - datos.posX;
    }
    
    // Recibir resultado del disparo (para sincronizar estado)
    this.recibirResultadoDisparo = function(datos) {
        // Por ahora, solo log - la física local debería calcular lo mismo
        console.log("📥 Resultado disparo rival:", datos);
    }
    
    // Recibir cambio de turno
    this.recibirCambioTurno = function(datos) {
        const game = this.shooterGame;
        if (!game) return;
        
        // Sincronizar viento
        if (datos.viento !== undefined) {
            game.viento = datos.viento;
            this.actualizarViento();
        }
        
        // Ahora es mi turno
        game.turno = 'jugador';
        game.turnoNumero = datos.turnoNumero;
        game.fase = 'movimiento';
        game.inicioTurno = Date.now();
        game.movimientoRestante = game.movimientoMax;
        
        // Actualizar UI
        $('#turnIndicator').removeClass('enemy').html('<span class="turn-text">🎯 TU TURNO</span>');
        $('#controlsPanel').removeClass('disabled firing').show();
        $('#turnTimer').removeClass('warning').text('30');
        $('#moveControls').removeClass('hidden');
        $('#aimControls').addClass('hidden');
        $('#phaseIndicator').html('🚶 <b>MOVIMIENTO</b> - Usa A/D para moverte, ESPACIO para apuntar');
        this.actualizarBarraMovimiento();
        
        $('#roundNumber').text(Math.ceil(game.turnoNumero / 2));
        
        console.log(`🔄 Mi turno! Turno ${game.turnoNumero}`);
    }
    
    // Rival listo para empezar la partida
    this.rivalListoParaEmpezar = function(datos) {
        const game = this.shooterGame;
        if (!game) return;
        
        game.rivalListoParaEmpezar = true;
        
        // Si ambos están listos, determinar quién empieza
        if (game.listoParaEmpezar && game.rivalListoParaEmpezar) {
            this.iniciarPartidaMultijugador();
        }
    }
    
    // Iniciar partida multijugador cuando ambos están listos
    this.iniciarPartidaMultijugador = function() {
        const game = this.shooterGame;
        if (!game) return;
        
        // El host (jugador que creó la partida) empieza primero
        if (game.esHost) {
            game.turno = 'jugador';
            game.fase = 'movimiento';
            $('#turnIndicator').removeClass('enemy').html('<span class="turn-text">🎯 TU TURNO</span>');
            $('#controlsPanel').removeClass('disabled').show();
            $('#moveControls').removeClass('hidden');
        } else {
            game.turno = 'enemigo';
            game.fase = 'esperandoRival';
            $('#turnIndicator').addClass('enemy').html('<span class="turn-text">⏳ TURNO ENEMIGO</span>');
            $('#controlsPanel').addClass('disabled');
        }
        
        console.log(`🎮 Partida multijugador iniciada! ${game.esHost ? 'Empiezo yo' : 'Empieza el rival'}`);
    }

    // ==========================================
    // PANTALLA DE ESPERA (Sistema antiguo para otros dominios)
    // ==========================================
    
    this.mostrarEsperandoRival = function() {
        this.limpiar();
        const dominio = this.dominioMultijugador || 'tierra';
        
        const waiting = `
            <div class="game-panel">
                <div class="waiting-screen">
                    <h3 class="waiting-title">⏳ Esperando Rival...</h3>
                    <div class="spinner"></div>
                    <div class="waiting-code">${ws.codigo || '???'}</div>
                    <p style="color: var(--color-plata);">Comparte este código con tu rival</p>
                    <button class="btn-back" id="btnCancelarPartida" style="margin-top: 20px;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        $("#au").html(waiting);
        
        $("#btnCancelarPartida").on("click", function() {
            ws.salirPartida();
            cw.mostrarPanelMultijugadorDominio(dominio);
        });
    }

    // ==========================================
    // JUEGO 2D - PROTOTIPO CON ALDEAS
    // ==========================================
    
    this.iniciarJuego2D = function(dominio, modo, dificultadOrRival) {
        this.limpiar();
        
        // Reset del sistema de capacidad del ejército
        this.capacidadUsada = 0;
        this.ejercitoSeleccionado = {};
        
        const temaClases = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea', 
            aire: 'domain-theme-air'
        };

        const bgClases = {
            tierra: 'domain-bg-tierra',
            mar: 'domain-bg-mar',
            aire: 'domain-bg-aire'
        };

        const nombresBases = {
            tierra: { jugador: '🏰 TU CUARTEL', enemigo: '🎯 CUARTEL ENEMIGO' },
            mar: { jugador: '⚓ TU PUERTO', enemigo: '🎯 PUERTO ENEMIGO' },
            aire: { jugador: '✈️ TU BASE AÉREA', enemigo: '🎯 BASE ENEMIGA' }
        };

        this.setDomainBackground(bgClases[dominio]);
        
        // Preparar defensas del jugador desde su aldea
        const aldeaDefensas = this.datosJugador.aldea[dominio] || [];
        const nivelCuartel = this.datosJugador.cuartelGeneral[dominio].nivel;
        const infoCuartel = this.cuartelGeneral.niveles[nivelCuartel - 1];
        const murosInfo = this.datosJugador.muros[dominio];
        const murosData = this.defensas[dominio].muros.niveles[murosInfo.nivel - 1];
        
        // Calcular estadísticas totales de la aldea del jugador
        let vidaTotalJugador = infoCuartel.vida; // Vida del cuartel
        let dpsJugador = 0;
        
        aldeaDefensas.forEach(def => {
            const defData = this.defensas[dominio].estructuras.find(d => d.id === def.id);
            if (defData && defData.niveles) {
                const nivelData = defData.niveles[def.nivel - 1];
                vidaTotalJugador += nivelData.vida;
                dpsJugador += nivelData.dps;
            }
        });
        
        // Añadir vida de muros
        vidaTotalJugador += murosInfo.cantidad * murosData.vida;
        
        // Configuración del juego
        this.juegoActual = {
            dominio: dominio,
            modo: modo,
            dificultad: dificultadOrRival,
            fase: 'ataque',
            turno: 'jugador',
            unidadesSeleccionadas: [],
            tropasEnCampo: [], // Tropas del atacante activas
            // Datos del jugador (defensor cuando es atacado)
            defensasJugador: aldeaDefensas.map(def => {
                const defData = this.defensas[dominio].estructuras.find(d => d.id === def.id);
                const nivelData = defData.niveles[def.nivel - 1];
                return {
                    id: def.id,
                    emoji: defData.emoji,
                    nombre: defData.nombre,
                    nivel: def.nivel,
                    vidaMax: nivelData.vida,
                    vidaActual: nivelData.vida,
                    dps: nivelData.dps,
                    destruido: false
                };
            }),
            cuartelJugador: {
                nivel: nivelCuartel,
                vidaMax: infoCuartel.vida,
                vidaActual: infoCuartel.vida
            },
            murosJugador: {
                cantidad: murosInfo.cantidad,
                nivel: murosInfo.nivel,
                vidaPorMuro: murosData.vida,
                vidaTotal: murosInfo.cantidad * murosData.vida,
                vidaActual: murosInfo.cantidad * murosData.vida
            },
            vidaTotalJugador: vidaTotalJugador,
            vidaActualJugador: vidaTotalJugador,
            dpsJugador: dpsJugador,
            // Datos del enemigo (se configuran según dificultad)
            defensasEnemigo: [],
            cuartelEnemigo: null,
            murosEnemigo: null,
            vidaTotalEnemigo: 0,
            vidaActualEnemigo: 0,
            dpsEnemigo: 0
        };

        const dataAtaque = this.unidadesAtaque[dominio];
        
        // Obtener unidades desbloqueadas del jugador
        const unidadesDisponibles = dataAtaque.unidades.filter(u => 
            this.datosJugador.unidadesDesbloqueadas[u.id]
        );

        // Configurar aldea enemiga según dificultad
        this.configurarAldeaEnemiga(dominio, dificultadOrRival);

        const gameHTML = `
            <div class="game-2d-container ${temaClases[dominio]}">
                <div class="game-header-bar">
                    <div class="game-info">
                        <span class="game-mode">${modo === 'ia' ? '🤖 vs IA' : '👥 vs Jugador'}</span>
                        <span class="game-domain">${dataAtaque.emoji} ${dataAtaque.nombre}</span>
                    </div>
                    <div class="game-stats-mini">
                        <div class="stat-mini">
                            <span>🎯 Destrucción:</span>
                            <span id="destructionPercent">0%</span>
                        </div>
                        <div class="stat-mini">
                            <span>⭐ Estrellas:</span>
                            <span id="starsEarned">☆☆☆</span>
                        </div>
                    </div>
                    <button class="btn-back" id="btnSalirJuego">✕ Salir</button>
                </div>

                <div class="resources-bar">
                    <div class="resource-item">
                        <span class="resource-icon">💰</span>
                        <span class="resource-value" id="gameCoins">${this.datosJugador.monedas}</span>
                    </div>
                    <div class="resource-item">
                        <span class="resource-icon">⚔️</span>
                        <span class="resource-value">${unidadesDisponibles.length} unidades</span>
                    </div>
                    <div class="resource-item">
                        <span class="resource-icon">🛡️</span>
                        <span class="resource-value">DPS Enemigo: ${this.juegoActual.dpsEnemigo}</span>
                    </div>
                </div>
                
                <!-- ALDEA ISOMÉTRICA ENEMIGA -->
                <div class="isometric-battlefield" id="isometricBattlefield">
                    <div class="iso-village enemy-village" id="enemyVillageIso">
                        ${this.generarAldeaIsometrica(dominio)}
                    </div>
                    
                    <!-- Zona de despliegue de tropas 3D -->
                    <div class="iso-deploy-zone deploy-ready" id="deployZone"></div>
                    
                    <!-- Contenedor de tropas activas -->
                    <div class="troops-container" id="troopsContainer"></div>
                    
                    <!-- Proyectiles -->
                    <div class="projectiles-container" id="projectilesContainer"></div>
                </div>
                
                <div class="game-controls">
                    <div class="phase-indicator">
                        <span id="phaseText">⚔️ SELECCIONA TROPAS - CAPACIDAD: <span id="capacidadUsada">0</span>/${dataAtaque.capacidadMaxima}</span>
                    </div>
                    
                    <div class="units-panel">
                        <div class="capacity-bar">
                            <div class="capacity-label">🎒 Capacidad del Ejército</div>
                            <div class="capacity-container">
                                <div class="capacity-fill" id="capacityFill" style="width: 0%"></div>
                            </div>
                            <div class="capacity-text"><span id="capacityUsed">0</span> / ${dataAtaque.capacidadMaxima}</div>
                        </div>
                        
                        <div class="units-selector" id="unitsSelector">
                            ${unidadesDisponibles.map(u => `
                                <div class="unit-slot" data-id="${u.id}" data-espacio="${u.espacio}" onclick="cw.seleccionarUnidad('${u.id}')">
                                    <span class="unit-emoji">${u.emoji}</span>
                                    <span class="unit-name">${u.nombre}</span>
                                    <span class="unit-stats">⚔️${u.ataque} ❤️${u.vida}</span>
                                    <span class="unit-space">📦${u.espacio}</span>
                                    <span class="unit-count" id="count-${u.id}">x0</span>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="selected-army" id="selectedArmy">
                            <div class="army-label">🪖 Ejército Seleccionado:</div>
                            <div class="army-units" id="armyUnits"></div>
                        </div>
                        
                        <div class="action-buttons">
                            <button class="btn-clear-army" onclick="cw.limpiarEjercito()">🗑️ Limpiar</button>
                            <button class="btn-attack" id="btnAtacar" onclick="cw.lanzarTropasAlClick()">
                                ⚔️ LANZAR ATAQUE
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(gameHTML);
        
        // Configurar zona de despliegue clickeable
        this.configurarZonaDespliegue();
        
        $("#btnSalirJuego").on("click", () => {
            if (confirm('¿Seguro que quieres abandonar la partida?')) {
                this.detenerCombate();
                if (modo === 'ia') {
                    cw.mostrarPanelUnJugadorDominio(dominio);
                } else {
                    cw.mostrarPanelMultijugadorDominio(dominio);
                }
            }
        });
        
        if (modo === 'ia') {
            this.iniciarIA(dificultadOrRival);
        }
        
        // Actualizar vidas en la UI
        this.actualizarUIVidasCombate();
    }
    
    // Configurar aldea enemiga según dificultad
    this.configurarAldeaEnemiga = function(dominio, dificultad) {
        const multiplicadores = {
            'beginner': { nivel: 1, defensas: 2, muros: 5 },
            'amateur': { nivel: 2, defensas: 3, muros: 10 },
            'professional': { nivel: 4, defensas: 5, muros: 20 },
            'legend': { nivel: 6, defensas: 8, muros: 35 }
        };
        const config = multiplicadores[dificultad] || multiplicadores['amateur'];
        
        // Cuartel enemigo
        const nivelCuartel = Math.min(config.nivel, 10);
        const infoCuartel = this.cuartelGeneral.niveles[nivelCuartel - 1];
        
        this.juegoActual.cuartelEnemigo = {
            nivel: nivelCuartel,
            vidaMax: infoCuartel.vida,
            vidaActual: infoCuartel.vida
        };
        
        // Muros enemigos
        const nivelMuros = Math.min(config.nivel, 10);
        const murosData = this.defensas[dominio].muros.niveles[nivelMuros - 1];
        
        this.juegoActual.murosEnemigo = {
            cantidad: config.muros,
            nivel: nivelMuros,
            vidaPorMuro: murosData.vida,
            vidaTotal: config.muros * murosData.vida,
            vidaActual: config.muros * murosData.vida,
            emoji: murosData.emoji
        };
        
        // Defensas enemigas (seleccionar según dificultad)
        const estructuras = this.defensas[dominio].estructuras;
        const defensasSeleccionadas = [];
        let dpsTotal = 0;
        let vidaTotal = infoCuartel.vida + (config.muros * murosData.vida);
        
        // Seleccionar defensas basándose en la dificultad
        for (let i = 0; i < Math.min(config.defensas, estructuras.length); i++) {
            const defData = estructuras[i];
            const nivelDef = Math.min(config.nivel, defData.maxNivel);
            const nivelData = defData.niveles[nivelDef - 1];
            
            defensasSeleccionadas.push({
                id: defData.id,
                emoji: defData.emoji,
                nombre: defData.nombre,
                nivel: nivelDef,
                vidaMax: nivelData.vida,
                vidaActual: nivelData.vida,
                dps: nivelData.dps,
                rango: defData.rango || 100, // Usar rango definido o 100 por defecto
                destruido: false
            });
            
            dpsTotal += nivelData.dps;
            vidaTotal += nivelData.vida;
        }
        
        this.juegoActual.defensasEnemigo = defensasSeleccionadas;
        this.juegoActual.vidaTotalEnemigo = vidaTotal;
        this.juegoActual.vidaActualEnemigo = vidaTotal;
        this.juegoActual.dpsEnemigo = dpsTotal;
    }
    
    // ==========================================
    // SISTEMA DE ALDEA ISOMÉTRICA 3D
    // ==========================================
    
    // Configuración visual por dominio
    this.configDominioVisual = {
        tierra: {
            terreno: 'terrain-tierra',
            colorBase: '#d4c4a8',
            colorEdificio: '#5a5a5a',
            colorDefensa: '#5a6a5a',
            colorMuro: '#7a7a7a',
            decoraciones: ['tank', 'crate', 'hedgehog', 'sandbag'],
            nombreTerreno: 'Desierto',
            emoji: '🏜️'
        },
        mar: {
            terreno: 'terrain-mar',
            colorBase: '#1a3a5a',
            colorEdificio: '#3a5a7a',
            colorDefensa: '#4a6a8a',
            colorMuro: '#2a4a6a',
            decoraciones: ['buoy', 'anchor', 'barrel', 'net'],
            nombreTerreno: 'Océano',
            emoji: '🌊'
        },
        aire: {
            terreno: 'terrain-aire',
            colorBase: '#87CEEB',
            colorEdificio: '#6a7a8a',
            colorDefensa: '#5a6a7a',
            colorMuro: '#4a5a6a',
            decoraciones: ['cloud', 'radar', 'satellite', 'balloon'],
            nombreTerreno: 'Cielo',
            emoji: '☁️'
        }
    };
    
    // Generar aldea isométrica 3D para combate (diferente por dominio)
    this.generarAldeaIsometrica = function(dominio) {
        const cuartel = this.juegoActual.cuartelEnemigo;
        const defensas = this.juegoActual.defensasEnemigo;
        const muros = this.juegoActual.murosEnemigo;
        const nombreBase = this.nombreBasePrincipal[dominio];
        const config = this.configDominioVisual[dominio];
        
        // Posiciones de edificios
        const posiciones = {
            cuartel: { x: 200, y: 80 },
            defensas: [
                { x: 80, y: 60 }, { x: 320, y: 60 },
                { x: 50, y: 140 }, { x: 350, y: 140 },
                { x: 80, y: 220 }, { x: 320, y: 220 },
                { x: 140, y: 180 }, { x: 260, y: 180 }
            ]
        };
        
        let html = `<div class="iso-scene iso-scene-${dominio}">`;
        
        // Terreno base según dominio
        html += `<div class="iso-ground ${config.terreno}"></div>`;
        
        // Contenedor de edificios
        html += '<div class="iso-buildings-container">';
        
        // BASE PRINCIPAL (diferente aspecto según dominio)
        const cuartelHTML = this.generarEdificioPrincipal(dominio, cuartel, nombreBase, posiciones.cuartel);
        html += cuartelHTML;
        
        // DEFENSAS con rango visual
        defensas.forEach((def, i) => {
            if (i >= posiciones.defensas.length) return;
            const pos = posiciones.defensas[i];
            
            // Obtener rango de la defensa
            const defData = this.defensas[dominio].estructuras.find(d => d.id === def.id);
            const rango = defData ? defData.rango : 80;
            
            html += this.generarDefensa3D(dominio, def, i, pos, rango);
        });
        
        // MUROS/BARRERAS según dominio
        html += this.generarMuros3D(dominio, muros);
        
        // Decoraciones específicas del dominio
        html += this.generarDecoraciones3D(dominio);
        
        html += '</div>'; // iso-buildings-container
        html += '</div>'; // iso-scene
        
        return html;
    }
    
    // Generar edificio principal según dominio
    this.generarEdificioPrincipal = function(dominio, cuartel, nombreBase, pos) {
        const estilos = {
            tierra: {
                clase: 'cuartel-tierra',
                icono: '🏰',
                estructura: `
                    <div class="edificio-3d edificio-bunker">
                        <div class="bunker-techo"></div>
                        <div class="bunker-cuerpo">
                            <div class="bunker-puerta"></div>
                            <div class="bunker-ventana"></div>
                            <div class="bunker-ventana"></div>
                        </div>
                        <div class="bunker-lado"></div>
                        <div class="bunker-antena"></div>
                    </div>
                `
            },
            mar: {
                clase: 'puerto-mar',
                icono: '⚓',
                estructura: `
                    <div class="edificio-3d edificio-puerto">
                        <div class="puerto-plataforma"></div>
                        <div class="puerto-torre">
                            <div class="puerto-faro"></div>
                        </div>
                        <div class="puerto-muelle"></div>
                        <div class="puerto-grua"></div>
                    </div>
                `
            },
            aire: {
                clase: 'base-aire',
                icono: '✈️',
                estructura: `
                    <div class="edificio-3d edificio-hangar">
                        <div class="hangar-techo"></div>
                        <div class="hangar-cuerpo">
                            <div class="hangar-puerta-grande"></div>
                        </div>
                        <div class="hangar-torre-control"></div>
                        <div class="hangar-radar"></div>
                    </div>
                `
            }
        };
        
        const estilo = estilos[dominio];
        
        return `
            <div class="building-3d cuartel-3d ${estilo.clase}" id="cuartelEnemigo" 
                 style="left: ${pos.x}px; top: ${pos.y}px;"
                 data-vida="${cuartel.vidaActual}" data-vida-max="${cuartel.vidaMax}">
                ${estilo.estructura}
                <div class="building-info">
                    <div class="building-hp-bar-3d">
                        <div class="hp-fill-3d" style="width: 100%"></div>
                    </div>
                    <span class="building-hp-text-3d">${cuartel.vidaActual}</span>
                    <span class="building-name-3d">${estilo.icono} ${nombreBase} Nv.${cuartel.nivel}</span>
                </div>
            </div>
        `;
    }
    
    // Generar defensa 3D con indicador de rango
    this.generarDefensa3D = function(dominio, def, index, pos, rango) {
        const tipoEdificio = this.getTipoEdificio3D(def.id, dominio);
        
        return `
            <div class="building-3d defensa-3d ${tipoEdificio} defensa-${dominio}" id="defensa${index}" 
                 style="left: ${pos.x}px; top: ${pos.y}px;"
                 data-index="${index}" data-vida="${def.vidaActual}" 
                 data-vida-max="${def.vidaMax}" data-dps="${def.dps}" data-rango="${rango}">
                <!-- Indicador de rango (círculo) -->
                <div class="rango-indicator" style="width: ${rango * 2}px; height: ${rango * 2}px; margin-left: -${rango - 25}px; margin-top: -${rango - 30}px;"></div>
                <div class="building-3d-wrapper">
                    <div class="def-emoji">${def.emoji}</div>
                    <div class="def-base"></div>
                </div>
                <div class="building-info">
                    <div class="building-hp-bar-3d">
                        <div class="hp-fill-3d" style="width: 100%"></div>
                    </div>
                    <span class="building-hp-text-3d">${def.vidaActual}</span>
                    <span class="building-name-3d">${def.nombre.substring(0, 12)}</span>
                </div>
            </div>
        `;
    }
    
    // Generar muros según dominio
    this.generarMuros3D = function(dominio, muros) {
        if (!muros || muros.cantidad === 0) return '';
        
        const murosConfig = {
            tierra: { emoji: '🧱', clase: 'muro-hormigon' },
            mar: { emoji: '🛟', clase: 'barrera-marina' },
            aire: { emoji: '🛡️', clase: 'escudo-energia' }
        };
        
        const config = murosConfig[dominio];
        let html = '<div class="muros-container">';
        
        // Posiciones de muros en perímetro
        const posicionesMuros = [];
        for (let i = 0; i < Math.min(muros.cantidad, 24); i++) {
            const angulo = (i / 24) * Math.PI * 2;
            const radio = 170;
            posicionesMuros.push({
                x: 200 + Math.cos(angulo) * radio,
                y: 150 + Math.sin(angulo) * radio * 0.5
            });
        }
        
        posicionesMuros.forEach((pos, i) => {
            html += `
                <div class="muro-3d ${config.clase}" id="muro${i}" 
                     style="left: ${pos.x}px; top: ${pos.y}px;"
                     data-index="${i}" data-vida="${muros.vidaPorMuro}">
                    <span class="muro-emoji">${config.emoji}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    // Obtener tipo de edificio 3D según ID de defensa y dominio
    this.getTipoEdificio3D = function(defId, dominio) {
        const tipos = {
            tierra: {
                'canon': 'torre-canon',
                'mina': 'mina-oculta',
                'francotirador': 'torre-sniper',
                'centinela': 'torre-centinela',
                'mortero': 'pozo-mortero',
                'misiles': 'lanzamisiles',
                'bunker': 'bunker-pesado',
                'railgun': 'canon-riel',
                'obelisco': 'obelisco'
            },
            mar: {
                'boya': 'campo-minas',
                'plataforma': 'plataforma-artillada',
                'torreta': 'canon-costero',
                'submarino': 'submarino-cazador',
                'hydra': 'hydra-marina',
                'fortaleza': 'ciudadela-oceanica'
            },
            aire: {
                'globo': 'red-globos',
                'radar': 'radar-avanzado',
                'aa': 'antiaereo',
                'pesado': 'boveda-misiles',
                'tormenta': 'generador-tormentas',
                'escudo': 'domo-celestial'
            }
        };
        
        const tiposDominio = tipos[dominio] || tipos.tierra;
        
        for (const [key, value] of Object.entries(tiposDominio)) {
            if (defId.toLowerCase().includes(key)) return value;
        }
        return 'defensa-generica';
    }
    
    // Generar decoraciones 3D según dominio
    this.generarDecoraciones3D = function(dominio) {
        let html = '<div class="iso-decorations">';
        
        const decoraciones = {
            tierra: [
                { tipo: 'tank', emoji: '🪖', x: -10, y: 200 },
                { tipo: 'tank', emoji: '🛻', x: 380, y: 180 },
                { tipo: 'crate', emoji: '📦', x: 60, y: 280 },
                { tipo: 'crate', emoji: '📦', x: 340, y: 290 },
                { tipo: 'hedgehog', emoji: '⚔️', x: 30, y: 100 },
                { tipo: 'sandbag', emoji: '🪖', x: 370, y: 80 }
            ],
            mar: [
                { tipo: 'buoy', emoji: '🛟', x: 20, y: 180 },
                { tipo: 'buoy', emoji: '🛟', x: 380, y: 200 },
                { tipo: 'anchor', emoji: '⚓', x: 50, y: 280 },
                { tipo: 'ship', emoji: '🚢', x: -20, y: 120 },
                { tipo: 'boat', emoji: '⛵', x: 400, y: 100 },
                { tipo: 'wave', emoji: '🌊', x: 200, y: 320 }
            ],
            aire: [
                { tipo: 'cloud', emoji: '☁️', x: 30, y: 60 },
                { tipo: 'cloud', emoji: '☁️', x: 350, y: 40 },
                { tipo: 'cloud', emoji: '⛅', x: 180, y: 30 },
                { tipo: 'satellite', emoji: '🛰️', x: 400, y: 150 },
                { tipo: 'plane', emoji: '✈️', x: -20, y: 200 },
                { tipo: 'balloon', emoji: '🎈', x: 380, y: 280 }
            ]
        };
        
        const items = decoraciones[dominio] || decoraciones.tierra;
        
        items.forEach((deco, i) => {
            html += `
                <div class="deco-3d deco-${deco.tipo}" style="left: ${deco.x}px; top: ${deco.y}px;">
                    <span class="deco-emoji">${deco.emoji}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    // Configurar zona de despliegue de tropas
    this.configurarZonaDespliegue = function() {
        const self = this;
        
        $('#deployZone').on('click', function(e) {
            if (self.juegoActual.unidadesSeleccionadas.length === 0) {
                self.mostrarMensaje('⚠️ Primero selecciona una tropa');
                return;
            }
            
            // Desplegar una tropa en la posición del click
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            self.desplegarTropaEnPosicion(x, y);
        });
    }
    
    // Desplegar una tropa en una posición específica
    this.desplegarTropaEnPosicion = function(x, y) {
        if (this.juegoActual.unidadesSeleccionadas.length === 0) return;
        
        const unidadId = this.juegoActual.unidadesSeleccionadas.shift();
        const dominio = this.juegoActual.dominio;
        
        // Buscar en tropas (shooter) o unidades según el tipo de juego
        let unidad;
        if (dominio === 'tierra' && this.unidadesAtaque.tierra.tipoJuego === 'shooter') {
            unidad = this.unidadesAtaque[dominio].tropas?.find(u => u.id === unidadId);
        } else {
            unidad = this.unidadesAtaque[dominio].unidades?.find(u => u.id === unidadId);
        }
        
        if (!unidad) return;
        
        // Crear tropa
        const tropaIndex = this.juegoActual.tropasEnCampo.length;
        const tropa = {
            id: unidadId,
            index: tropaIndex,
            emoji: unidad.emoji,
            nombre: unidad.nombre,
            ataque: unidad.ataque,
            vidaMax: unidad.vida,
            vidaActual: unidad.vida,
            velocidad: unidad.velocidad || 3,
            x: x,
            y: 100, // Empieza en la zona de despliegue
            objetivo: null,
            atacando: false
        };
        
        this.juegoActual.tropasEnCampo.push(tropa);
        
        // Renderizar tropa
        const tropaHTML = `
            <div class="iso-tropa" id="tropa${tropaIndex}" 
                 style="left: ${x}px; bottom: ${y}px;"
                 data-index="${tropaIndex}">
                <div class="tropa-sprite">${unidad.emoji}</div>
                <div class="tropa-hp-bar">
                    <div class="hp-fill" style="width: 100%"></div>
                </div>
            </div>
        `;
        
        $('#troopsContainer').append(tropaHTML);
        
        // Actualizar slot de unidad
        $(`.unit-slot[data-id="${unidadId}"]`).first().addClass('deployed');
        
        // Si no quedan unidades seleccionadas, iniciar combate
        if (this.juegoActual.unidadesSeleccionadas.length === 0 && !this.combateActivo) {
            setTimeout(() => this.iniciarCombateIsometrico(), 500);
        }
        
        this.mostrarMensaje(`🪖 ${unidad.nombre} desplegado!`);
    }
    
    // Lanzar tropas al hacer click en el botón (despliega todas las seleccionadas)
    this.lanzarTropasAlClick = function() {
        if (this.juegoActual.unidadesSeleccionadas.length === 0) {
            this.mostrarMensaje('⚠️ Selecciona al menos una tropa');
            return;
        }
        
        // Deshabilitar botón
        $('#btnAtacar').prop('disabled', true);
        
        const deployZone = $('#deployZone');
        const width = deployZone.width() || 600;
        
        // Desplegar todas las tropas en posiciones aleatorias distribuidas
        const unidadesAClonar = [...this.juegoActual.unidadesSeleccionadas];
        const totalTropas = unidadesAClonar.length;
        
        // Limpiar selección actual
        this.juegoActual.unidadesSeleccionadas = [];
        
        // Distribuir tropas en línea con algo de variación
        unidadesAClonar.forEach((unidadId, i) => {
            setTimeout(() => {
                // Calcular posición X distribuida uniformemente con variación
                const spacing = (width - 100) / (totalTropas + 1);
                const baseX = 50 + spacing * (i + 1);
                const x = baseX + (Math.random() * 40 - 20); // Variación de ±20px
                
                this.juegoActual.unidadesSeleccionadas = [unidadId];
                this.desplegarTropaEnPosicion(x, 50 + Math.random() * 30);
            }, i * 150); // Despliegue más rápido
        });
        
        // Limpiar sistema de capacidad después de desplegar
        setTimeout(() => {
            this.ejercitoSeleccionado = {};
            this.capacidadUsada = 0;
            $('.unit-count').text('x0');
            this.actualizarUICapacidad();
        }, (totalTropas + 1) * 150);
    }
    
    // Iniciar combate con sistema isométrico
    this.iniciarCombateIsometrico = function() {
        this.combateActivo = true;
        
        this.intervaloCombate = setInterval(() => {
            if (!this.combateActivo) {
                clearInterval(this.intervaloCombate);
                return;
            }
            
            // Mover tropas hacia objetivos
            this.moverTropasIsometrico();
            
            // Defensas disparan a tropas
            this.defensasDisparanIsometrico();
            
            // Tropas atacan edificios
            this.tropasAtacanIsometrico();
            
            // Actualizar UI de destrucción
            this.actualizarUIDestruccion();
            
            // Verificar fin de batalla
            this.verificarFinBatalla();
            
        }, 300); // Tick más rápido para fluidez
    }
    
    // Mover tropas hacia objetivos
    this.moverTropasIsometrico = function() {
        this.juegoActual.tropasEnCampo.forEach((tropa, index) => {
            if (tropa.vidaActual <= 0) return;
            
            // Buscar objetivo más cercano si no tiene uno
            if (!tropa.objetivo || tropa.objetivo.destruido) {
                tropa.objetivo = this.buscarObjetivoMasCercano(tropa);
            }
            
            if (!tropa.objetivo) return;
            
            // Mover hacia el objetivo
            const targetY = tropa.y + (tropa.velocidad * 5);
            tropa.y = Math.min(targetY, 350); // Límite de la aldea
            
            $(`#tropa${index}`).css('bottom', tropa.y + 'px');
            
            // Si llegó al objetivo, comenzar a atacar
            if (tropa.y >= 300) {
                tropa.atacando = true;
                $(`#tropa${index}`).addClass('attacking');
            }
        });
    }
    
    // Buscar objetivo más cercano
    this.buscarObjetivoMasCercano = function(tropa) {
        // Primero muros
        const murosVivos = this.juegoActual.murosEnemigo.vidaActual > 0;
        if (murosVivos) {
            return { tipo: 'muros', ...this.juegoActual.murosEnemigo };
        }
        
        // Luego defensas
        const defensaViva = this.juegoActual.defensasEnemigo.find(d => !d.destruido);
        if (defensaViva) {
            return { tipo: 'defensa', ...defensaViva };
        }
        
        // Finalmente cuartel
        if (this.juegoActual.cuartelEnemigo.vidaActual > 0) {
            return { tipo: 'cuartel', ...this.juegoActual.cuartelEnemigo };
        }
        
        return null;
    }
    
    // Defensas disparan a tropas (isométrico con sistema de rango)
    this.defensasDisparanIsometrico = function() {
        const tropasVivas = this.juegoActual.tropasEnCampo.filter(t => t.vidaActual > 0);
        if (tropasVivas.length === 0) return;
        
        this.juegoActual.defensasEnemigo.forEach((def, defIndex) => {
            if (def.destruido || def.dps <= 0) return;
            
            const defElement = $(`#defensa${defIndex}`);
            if (!defElement.length) return;
            
            // Obtener posición de la defensa
            const defPos = defElement.position();
            const defX = defPos.left + 25;
            const defY = defPos.top + 30;
            
            // Buscar tropas dentro del rango
            const rangoDefensa = def.rango || 100; // rango por defecto si no tiene
            const tropasEnRango = [];
            
            tropasVivas.forEach((tropa) => {
                const tropaElement = $(`#tropa${tropa.index}`);
                if (!tropaElement.length) return;
                
                const tropaPos = tropaElement.position();
                const tropaX = tropaPos.left + 15;
                const tropaY = tropaPos.top + 15;
                
                // Calcular distancia
                const distancia = Math.sqrt(
                    Math.pow(defX - tropaX, 2) + Math.pow(defY - tropaY, 2)
                );
                
                if (distancia <= rangoDefensa) {
                    tropasEnRango.push({ tropa, distancia, tropaX, tropaY });
                }
            });
            
            // Si hay tropas en rango, disparar a la más cercana
            if (tropasEnRango.length > 0) {
                // Ordenar por distancia y tomar la más cercana
                tropasEnRango.sort((a, b) => a.distancia - b.distancia);
                const objetivo = tropasEnRango[0].tropa;
                const tropaIndex = objetivo.index;
                
                // Mostrar rango activo
                defElement.find('.rango-indicator').addClass('activo');
                defElement.addClass('defensa-en-rango');
                
                // Daño por tick (DPS / 3.33 porque tick es cada 300ms)
                const daño = def.dps / 3.33;
                objetivo.vidaActual -= daño;
                
                // Efecto visual de disparo
                this.mostrarDisparoIsometrico(defIndex, tropaIndex);
                
                // Marcar tropa atacada
                $(`#tropa${tropaIndex}`).addClass('tropa-en-rango');
                
                // Actualizar HP de la tropa
                if (objetivo.vidaActual <= 0) {
                    objetivo.vidaActual = 0;
                    $(`#tropa${tropaIndex}`).addClass('destruida');
                    setTimeout(() => $(`#tropa${tropaIndex}`).remove(), 500);
                } else {
                    const porcVida = (objetivo.vidaActual / objetivo.vidaMax * 100);
                    $(`#tropa${tropaIndex} .hp-fill`).css('width', porcVida + '%');
                }
            } else {
                // Sin tropas en rango, desactivar indicadores
                defElement.find('.rango-indicator').removeClass('activo');
                defElement.removeClass('defensa-en-rango');
            }
        });
        
        // Quitar marca de tropas que ya no están siendo atacadas
        setTimeout(() => {
            $('.tropa-en-rango').removeClass('tropa-en-rango');
        }, 200);
    }
    
    // Mostrar disparo de defensa
    this.mostrarDisparoIsometrico = function(defIndex, tropaIndex) {
        const defensa = $(`#defensa${defIndex}`);
        const tropa = $(`#tropa${tropaIndex}`);
        
        if (!defensa.length || !tropa.length) return;
        
        defensa.addClass('disparando');
        setTimeout(() => defensa.removeClass('disparando'), 200);
        
        // Crear proyectil
        const proyectil = $(`<div class="iso-projectile">💥</div>`);
        $('#projectilesContainer').append(proyectil);
        
        proyectil.css({
            left: defensa.position().left + 20,
            top: defensa.position().top
        }).animate({
            left: tropa.position().left,
            top: tropa.position().top
        }, 200, function() {
            $(this).remove();
        });
    }
    
    // Tropas atacan edificios
    this.tropasAtacanIsometrico = function() {
        this.juegoActual.tropasEnCampo.forEach((tropa) => {
            if (tropa.vidaActual <= 0 || !tropa.atacando) return;
            
            // Atacar muros primero
            if (this.juegoActual.murosEnemigo.vidaActual > 0) {
                this.juegoActual.murosEnemigo.vidaActual -= tropa.ataque / 3;
                this.juegoActual.vidaActualEnemigo -= tropa.ataque / 3;
                
                // Actualizar visual de muros
                const porcMuros = Math.max(0, (this.juegoActual.murosEnemigo.vidaActual / this.juegoActual.murosEnemigo.vidaTotal) * 100);
                $('.muro-iso .hp-fill').css('width', porcMuros + '%');
                
                if (this.juegoActual.murosEnemigo.vidaActual <= 0) {
                    $('.muro-iso').addClass('destruida');
                }
                return;
            }
            
            // Atacar defensas
            const defensaViva = this.juegoActual.defensasEnemigo.find(d => !d.destruido);
            if (defensaViva) {
                const defIndex = this.juegoActual.defensasEnemigo.indexOf(defensaViva);
                defensaViva.vidaActual -= tropa.ataque / 3;
                this.juegoActual.vidaActualEnemigo -= tropa.ataque / 3;
                
                // Actualizar visual de defensa
                const porcDef = Math.max(0, (defensaViva.vidaActual / defensaViva.vidaMax) * 100);
                $(`#defensa${defIndex} .hp-fill`).css('width', porcDef + '%');
                $(`#defensa${defIndex} .building-hp-text`).text(Math.max(0, Math.floor(defensaViva.vidaActual)));
                
                if (defensaViva.vidaActual <= 0) {
                    defensaViva.destruido = true;
                    $(`#defensa${defIndex}`).addClass('destruida');
                }
                return;
            }
            
            // Atacar cuartel
            if (this.juegoActual.cuartelEnemigo.vidaActual > 0) {
                this.juegoActual.cuartelEnemigo.vidaActual -= tropa.ataque / 3;
                this.juegoActual.vidaActualEnemigo -= tropa.ataque / 3;
                
                // Actualizar visual del cuartel
                const porcCuartel = Math.max(0, (this.juegoActual.cuartelEnemigo.vidaActual / this.juegoActual.cuartelEnemigo.vidaMax) * 100);
                $('#cuartelEnemigo .hp-fill').css('width', porcCuartel + '%');
                $('#cuartelEnemigo .building-hp-text').text(Math.max(0, Math.floor(this.juegoActual.cuartelEnemigo.vidaActual)));
            }
        });
    }
    
    // Actualizar UI de destrucción y estrellas
    this.actualizarUIDestruccion = function() {
        const porcDestruccion = Math.floor(100 - (this.juegoActual.vidaActualEnemigo / this.juegoActual.vidaTotalEnemigo * 100));
        
        $('#destructionPercent').text(porcDestruccion + '%');
        
        // Actualizar estrellas
        let estrellas = '☆☆☆';
        if (porcDestruccion >= 50) estrellas = '⭐☆☆';
        if (porcDestruccion >= 75) estrellas = '⭐⭐☆';
        if (porcDestruccion >= 100 || this.juegoActual.cuartelEnemigo.vidaActual <= 0) estrellas = '⭐⭐⭐';
        
        $('#starsEarned').text(estrellas);
    }
    
    // ==========================================
    // FUNCIONES DE COMBATE LEGACY (mantener compatibilidad)
    // ==========================================
    
    // Actualizar UI de vidas en combate
    this.actualizarUIVidasCombate = function() {
        // Ya no se usan barras globales, pero mantener por compatibilidad
        this.actualizarUIDestruccion();
    }
    
    // Lanzar tropas al campo de batalla (legacy)
    this.lanzarTropas = function() {
        this.lanzarTropasAlClick();
    }
    
    // Detener combate
    this.detenerCombate = function() {
        this.combateActivo = false;
        if (this.intervaloCombate) {
            clearInterval(this.intervaloCombate);
        }
    }
    
    // Verificar fin de batalla
    this.verificarFinBatalla = function() {
        const tropasVivas = this.juegoActual.tropasEnCampo.filter(t => t.vidaActual > 0).length;
        
        // Calcular porcentaje de destrucción actual
        let porcDestruccion = 0;
        if (this.juegoActual.vidaTotalEnemigo > 0) {
            porcDestruccion = Math.floor(100 - (this.juegoActual.vidaActualEnemigo / this.juegoActual.vidaTotalEnemigo * 100));
        }
        
        // Victoria total: destruir cuartel enemigo
        if (this.juegoActual.cuartelEnemigo.vidaActual <= 0) {
            this.detenerCombate();
            this.finalizarPartida(true, 100); // 100% destrucción
            return;
        }
        
        // Todas las tropas eliminadas
        if (tropasVivas === 0 && this.juegoActual.tropasEnCampo.length > 0) {
            this.detenerCombate();
            
            if (porcDestruccion >= 50) {
                // Victoria parcial (más del 50%)
                this.finalizarPartida(true, porcDestruccion);
            } else {
                // Derrota
                this.finalizarPartida(false, porcDestruccion);
            }
            return;
        }
        
        // Permitir lanzar más tropas si no hay activas
        if (tropasVivas === 0) {
            $('#btnAtacar').prop('disabled', false);
            this.juegoActual.tropasEnCampo = [];
        }
    }

    this.generarBaseEnemiga = function(dominio) {
        const iconosBase = {
            tierra: { centro: '🏰', vidaCentro: 150 },
            mar: { centro: '🏯', vidaCentro: 150 },
            aire: { centro: '🛡️', vidaCentro: 150 }
        };
        
        const iconos = iconosBase[dominio];
        const edificios = this.juegoActual.edificiosEnemigo || [];
        
        let html = '';
        
        // Centro/Cuartel principal
        html += `<div class="village-slot building occupied center-building" id="enemyCenter" data-health="${iconos.vidaCentro}" data-max-health="${iconos.vidaCentro}">
            <span class="building-emoji">${iconos.centro}</span>
            <span class="building-name">Cuartel</span>
            <div class="slot-health"><div class="slot-health-fill" id="enemyCenterHealth" style="width: 100%"></div></div>
            <span class="building-hp">${iconos.vidaCentro}/${iconos.vidaCentro}</span>
        </div>`;
        
        // Edificios/Defensas del enemigo
        edificios.forEach((edificio, i) => {
            if (!edificio.destruido) {
                const posiciones = [
                    { col: 1, row: 1 }, { col: 5, row: 1 }, { col: 2, row: 2 },
                    { col: 4, row: 2 }, { col: 3, row: 3 }
                ];
                const pos = posiciones[i % posiciones.length];
                
                html += `<div class="village-slot building occupied" style="grid-column: ${pos.col}; grid-row: ${pos.row};" 
                    id="enemyBuilding${i}" data-building-id="${edificio.id}" data-health="${edificio.vidaActual}" data-max-health="${edificio.vidaMax}">
                    <span class="building-emoji">${edificio.emoji}</span>
                    <span class="building-name">${edificio.nombre}</span>
                    <div class="slot-health"><div class="slot-health-fill" id="enemyBuildingHealth${i}" style="width: ${(edificio.vidaActual/edificio.vidaMax)*100}%"></div></div>
                    <span class="building-hp">${edificio.vidaActual}/${edificio.vidaMax}</span>
                </div>`;
            }
        });
        
        return html;
    }

    this.generarBaseJugador = function(dominio) {
        const edificios = this.juegoActual.edificiosJugador || this.datosJugador.edificiosBase[dominio] || [];
        
        const iconosBase = {
            tierra: { centro: '🏰', vidaCentro: 100 },
            mar: { centro: '⚓', vidaCentro: 100 },
            aire: { centro: '🛩️', vidaCentro: 100 }
        };
        
        const iconos = iconosBase[dominio];
        let html = '';
        
        // Centro/Cuartel principal del jugador
        html += `<div class="village-slot building occupied center-building" id="playerCenter" data-health="${iconos.vidaCentro}" data-max-health="${iconos.vidaCentro}">
            <span class="building-emoji">${iconos.centro}</span>
            <span class="building-name">Tu Cuartel</span>
            <div class="slot-health"><div class="slot-health-fill" id="playerCenterHealth" style="width: 100%"></div></div>
            <span class="building-hp">${iconos.vidaCentro}/${iconos.vidaCentro}</span>
        </div>`;
        
        // Edificios/Defensas del jugador
        edificios.forEach((edificio, i) => {
            const vidaActual = edificio.vidaActual || edificio.vidaMax;
            const posiciones = [
                { col: 1, row: 1 }, { col: 5, row: 1 }, { col: 2, row: 2 },
                { col: 4, row: 2 }, { col: 3, row: 3 }
            ];
            const pos = posiciones[i % posiciones.length];
            
            html += `<div class="village-slot building occupied" style="grid-column: ${pos.col}; grid-row: ${pos.row};" 
                id="playerBuilding${i}" data-building-id="${edificio.id}" data-health="${vidaActual}" data-max-health="${edificio.vidaMax}">
                <span class="building-emoji">${edificio.emoji}</span>
                <span class="building-name">${edificio.nombre}</span>
                <div class="slot-health"><div class="slot-health-fill" id="playerBuildingHealth${i}" style="width: ${(vidaActual/edificio.vidaMax)*100}%"></div></div>
                <span class="building-hp">${vidaActual}/${edificio.vidaMax}</span>
            </div>`;
        });
        
        // Si no tiene edificios, mostrar mensaje
        if (edificios.length === 0) {
            html += `<div class="no-buildings-msg">
                <p>⚠️ Sin defensas</p>
                <p style="font-size: 0.7rem;">Compra edificios en la tienda</p>
            </div>`;
        }
        
        return html;
    }

    // Sistema de capacidad del ejército
    this.capacidadUsada = 0;
    this.ejercitoSeleccionado = {}; // { unidadId: cantidad }
    
    this.seleccionarUnidad = function(unidadId) {
        const dominio = this.juegoActual.dominio;
        
        // Buscar en tropas o unidades según el tipo de juego
        let unidad;
        if (dominio === 'tierra' && this.unidadesAtaque.tierra.tipoJuego === 'shooter') {
            unidad = this.unidadesAtaque[dominio].tropas?.find(u => u.id === unidadId);
        } else {
            unidad = this.unidadesAtaque[dominio].unidades?.find(u => u.id === unidadId);
        }
        
        const capacidadMax = this.unidadesAtaque[dominio].capacidadMaxima;
        
        if (!unidad) return;
        
        // Verificar si hay espacio
        if (this.capacidadUsada + unidad.espacio > capacidadMax) {
            this.mostrarMensaje(`⚠️ No hay espacio. Capacidad: ${this.capacidadUsada}/${capacidadMax}`);
            return;
        }
        
        // Añadir unidad al ejército
        if (!this.ejercitoSeleccionado[unidadId]) {
            this.ejercitoSeleccionado[unidadId] = 0;
        }
        this.ejercitoSeleccionado[unidadId]++;
        this.capacidadUsada += unidad.espacio;
        
        // Añadir a la cola de despliegue
        this.juegoActual.unidadesSeleccionadas.push(unidadId);
        
        // Actualizar UI
        this.actualizarUICapacidad();
    }
    
    this.actualizarUICapacidad = function() {
        const dominio = this.juegoActual.dominio;
        const capacidadMax = this.unidadesAtaque[dominio].capacidadMaxima;
        const porcentaje = (this.capacidadUsada / capacidadMax) * 100;
        
        $('#capacityFill').css('width', `${porcentaje}%`);
        $('#capacityUsed').text(this.capacidadUsada);
        $('#capacidadUsada').text(this.capacidadUsada);
        
        // Actualizar contadores por unidad
        Object.keys(this.ejercitoSeleccionado).forEach(id => {
            $(`#count-${id}`).text(`x${this.ejercitoSeleccionado[id]}`);
        });
        
        // Actualizar panel de ejército seleccionado
        let armyHTML = '';
        Object.keys(this.ejercitoSeleccionado).forEach(id => {
            // Buscar en tropas o unidades según el tipo de juego
            let unidad;
            if (dominio === 'tierra' && this.unidadesAtaque.tierra.tipoJuego === 'shooter') {
                unidad = this.unidadesAtaque[dominio].tropas?.find(u => u.id === id);
            } else {
                unidad = this.unidadesAtaque[dominio].unidades?.find(u => u.id === id);
            }
            if (unidad && this.ejercitoSeleccionado[id] > 0) {
                armyHTML += `
                    <div class="army-unit" onclick="cw.quitarUnidadEjercito('${id}')">
                        <span>${unidad.emoji}</span>
                        <span class="army-unit-count">x${this.ejercitoSeleccionado[id]}</span>
                    </div>
                `;
            }
        });
        $('#armyUnits').html(armyHTML || '<span style="color: #888;">Ninguna tropa seleccionada</span>');
        
        // Color de la barra según capacidad
        if (porcentaje >= 90) {
            $('#capacityFill').css('background', 'linear-gradient(90deg, #e53935, #ff5722)');
        } else if (porcentaje >= 60) {
            $('#capacityFill').css('background', 'linear-gradient(90deg, #ff9800, #ffc107)');
        } else {
            $('#capacityFill').css('background', 'linear-gradient(90deg, #4caf50, #8bc34a)');
        }
    }
    
    this.quitarUnidadEjercito = function(unidadId) {
        const dominio = this.juegoActual.dominio;
        
        // Buscar en tropas o unidades según el tipo de juego
        let unidad;
        if (dominio === 'tierra' && this.unidadesAtaque.tierra.tipoJuego === 'shooter') {
            unidad = this.unidadesAtaque[dominio].tropas?.find(u => u.id === unidadId);
        } else {
            unidad = this.unidadesAtaque[dominio].unidades?.find(u => u.id === unidadId);
        }
        
        if (!unidad || !this.ejercitoSeleccionado[unidadId]) return;
        
        this.ejercitoSeleccionado[unidadId]--;
        this.capacidadUsada -= unidad.espacio;
        
        // Quitar de la cola
        const index = this.juegoActual.unidadesSeleccionadas.indexOf(unidadId);
        if (index > -1) {
            this.juegoActual.unidadesSeleccionadas.splice(index, 1);
        }
        
        if (this.ejercitoSeleccionado[unidadId] <= 0) {
            delete this.ejercitoSeleccionado[unidadId];
        }
        
        this.actualizarUICapacidad();
    }
    
    this.limpiarEjercito = function() {
        this.ejercitoSeleccionado = {};
        this.capacidadUsada = 0;
        this.juegoActual.unidadesSeleccionadas = [];
        
        // Reset contadores
        $('.unit-count').text('x0');
        this.actualizarUICapacidad();
    }

    this.ejecutarAtaque = function() {
        if (this.juegoActual.unidadesSeleccionadas.length === 0) {
            this.mostrarMensaje('⚠️ Selecciona al menos una unidad');
            return;
        }

        // En multijugador, verificar que sea nuestro turno
        if (this.juegoActual.modo === 'multi' && this.juegoActual.turno !== 'jugador') {
            this.mostrarMensaje('⚠️ Espera tu turno');
            return;
        }

        // Deshabilitar botón mientras ataca
        $('#btnAtacar').prop('disabled', true);
        
        const dominio = this.juegoActual.dominio;
        const combatZone = $('#unitsInCombat');
        
        let dañoTotal = 0;
        const unidadesAtacando = [];
        
        this.juegoActual.unidadesSeleccionadas.forEach(unidadId => {
            // Buscar en tropas o unidades según el tipo de juego
            let unidad;
            if (dominio === 'tierra' && this.unidadesAtaque.tierra.tipoJuego === 'shooter') {
                unidad = this.unidadesAtaque[dominio].tropas?.find(u => u.id === unidadId);
            } else {
                unidad = this.unidadesAtaque[dominio].unidades?.find(u => u.id === unidadId);
            }
            if (unidad) {
                dañoTotal += unidad.ataque || unidad.stats?.daño || 10;
                unidadesAtacando.push({ id: unidad.id, emoji: unidad.emoji, ataque: unidad.ataque });
                combatZone.append(`
                    <div class="attacking-unit" style="animation: attackMove 1s forwards;">
                        ${unidad.emoji}
                    </div>
                `);
            }
        });
        
        setTimeout(() => {
            // Distribuir daño entre edificios enemigos
            this.aplicarDañoAEdificios(dañoTotal, 'enemigo');
            
            this.mostrarMensaje(`⚔️ ¡Infligiste ${dañoTotal} de daño!`);
            
            $('.enemy-base').addClass('damaged');
            setTimeout(() => $('.enemy-base').removeClass('damaged'), 500);
            
            combatZone.empty();
            $('.unit-slot').removeClass('selected');
            this.juegoActual.unidadesSeleccionadas = [];
            
            // En multijugador, enviar el ataque al rival y pasar turno
            if (this.juegoActual.modo === 'multi') {
                ws.realizarAtaque(unidadesAtacando, dañoTotal);
                
                if (this.juegoActual.vidaActualEnemigo <= 0) {
                    ws.finPartida($.cookie('email') || $.cookie('nick'));
                    this.finPartidaMulti(true);
                    return;
                }
                
                // Pasar turno al rival
                this.juegoActual.turno = 'enemigo';
                $('#turnIndicator').removeClass('your-turn').addClass('enemy-turn');
                $('#turnText').text('⏳ TURNO DEL RIVAL - Esperando...');
                
                ws.finTurno(this.juegoActual.vidaActualJugador, this.juegoActual.vidaActualEnemigo);
                
            } else {
                // Modo IA
                $('#btnAtacar').prop('disabled', false);
                
                if (this.juegoActual.vidaActualEnemigo <= 0) {
                    this.finalizarPartida(true);
                    return;
                }
                
                if (this.juegoActual.modo === 'ia') {
                    setTimeout(() => this.turnoIA(), 1000);
                }
            }
            
        }, 1000);
    }
    
    // Aplicar daño a edificios individuales
    this.aplicarDañoAEdificios = function(daño, objetivo) {
        const esEnemigo = objetivo === 'enemigo';
        const edificios = esEnemigo ? this.juegoActual.edificiosEnemigo : this.juegoActual.edificiosJugador;
        let dañoRestante = daño;
        
        // Primero atacar edificios, luego el centro
        const edificiosVivos = edificios.filter(e => e.vidaActual > 0 && !e.destruido);
        
        // Distribuir daño entre edificios activos
        edificiosVivos.forEach((edificio, index) => {
            if (dañoRestante <= 0) return;
            
            const dañoEdificio = Math.min(dañoRestante, edificio.vidaActual);
            edificio.vidaActual -= dañoEdificio;
            dañoRestante -= dañoEdificio;
            
            // Actualizar UI del edificio
            const prefix = esEnemigo ? 'enemy' : 'player';
            const buildingIndex = edificios.indexOf(edificio);
            const $healthBar = $(`#${prefix}BuildingHealth${buildingIndex}`);
            const $hpText = $(`#${prefix}Building${buildingIndex} .building-hp`);
            
            if ($healthBar.length) {
                const porc = (edificio.vidaActual / edificio.vidaMax) * 100;
                $healthBar.css('width', porc + '%');
                $hpText.text(`${Math.max(0, edificio.vidaActual)}/${edificio.vidaMax}`);
            }
            
            // Si el edificio fue destruido
            if (edificio.vidaActual <= 0) {
                edificio.destruido = true;
                $(`#${prefix}Building${buildingIndex}`).addClass('destroyed');
                this.mostrarMensaje(`💥 ¡${edificio.nombre} destruido!`);
            }
        });
        
        // Si queda daño, aplicarlo a la vida total de la base
        if (esEnemigo) {
            this.juegoActual.vidaActualEnemigo -= daño;
            if (this.juegoActual.vidaActualEnemigo < 0) this.juegoActual.vidaActualEnemigo = 0;
        } else {
            this.juegoActual.vidaActualJugador -= daño;
            if (this.juegoActual.vidaActualJugador < 0) this.juegoActual.vidaActualJugador = 0;
        }
        
        this.actualizarUIVidasEdificios();
    };

    this.iniciarIA = function(dificultad) {
        this.iaDificultad = dificultad;
        const multiplicadores = {
            'beginner': 0.5,
            'amateur': 0.75,
            'professional': 1,
            'legend': 1.5
        };
        this.iaMultiplicador = multiplicadores[dificultad] || 1;
    }

    this.turnoIA = function() {
        // Cambiar indicador de turno
        $('#turnIndicator').removeClass('your-turn').addClass('enemy-turn');
        $('#turnText').text('🤖 TURNO ENEMIGO - Preparando ataque...');
        
        const dañoBase = 15;
        const daño = Math.floor(dañoBase * this.iaMultiplicador * (0.8 + Math.random() * 0.4));
        
        // Animación de ataque enemigo
        const combatZone = $('#unitsInCombat');
        const unidadesEnemigas = {
            tierra: ['🪖', '🛡️'],
            mar: ['🚤', '⛵'],
            aire: ['🛸', '🚁']
        };
        const dominio = this.juegoActual.dominio;
        const unidadEmoji = unidadesEnemigas[dominio][Math.floor(Math.random() * 2)];
        
        combatZone.html(`<div class="attacking-unit" style="animation: attackMove 1s forwards reverse;">${unidadEmoji}</div>`);
        
        setTimeout(() => {
            // Aplicar daño a edificios del jugador
            this.aplicarDañoAEdificios(daño, 'jugador');
            
            $('.player-base').addClass('damaged');
            setTimeout(() => $('.player-base').removeClass('damaged'), 500);
            
            this.mostrarMensaje(`🤖 IA te atacó con ${daño} de daño`);
            
            combatZone.empty();
            
            if (this.juegoActual.vidaActualJugador <= 0) {
                this.finalizarPartida(false);
            } else {
                // Devolver turno al jugador
                setTimeout(() => {
                    $('#turnIndicator').removeClass('enemy-turn').addClass('your-turn');
                    $('#turnText').text('⚔️ TU TURNO - Selecciona y ataca');
                }, 500);
            }
        }, 1000);
    }

    this.finalizarPartida = function(victoria, porcentajeDestruccion = 100) {
        const dominio = this.juegoActual.dominio;
        
        // Recompensas base según dificultad
        const recompensasOro = {
            beginner: { victoria: 50, derrota: 15 },
            amateur: { victoria: 100, derrota: 30 },
            professional: { victoria: 200, derrota: 50 },
            legend: { victoria: 400, derrota: 100 }
        };
        
        const recompensasDiamante = {
            beginner: { victoria: 0, derrota: 0 },
            amateur: { victoria: 1, derrota: 0 },
            professional: { victoria: 3, derrota: 1 },
            legend: { victoria: 10, derrota: 2 }
        };
        
        const dificultad = this.juegoActual.dificultad || 'amateur';
        let oroBase = victoria ? recompensasOro[dificultad].victoria : recompensasOro[dificultad].derrota;
        let diamantesBase = victoria ? recompensasDiamante[dificultad].victoria : recompensasDiamante[dificultad].derrota;
        
        // Ajustar recompensas según porcentaje de destrucción
        let oroGanado = Math.floor(oroBase * (porcentajeDestruccion / 100));
        let diamantesGanados = Math.floor(diamantesBase * (porcentajeDestruccion / 100));
        
        // Bonificación por victoria total (100%)
        if (victoria && porcentajeDestruccion === 100) {
            oroGanado = Math.floor(oroGanado * 1.5); // +50% bonus
            diamantesGanados += 1; // +1 diamante extra
        }
        
        this.datosJugador.monedas += oroGanado;
        this.datosJugador.diamantes += diamantesGanados;
        this.datosJugador.partidasJugadas++;
        
        // Calcular estrellas
        let estrellas = 0;
        if (porcentajeDestruccion >= 50) estrellas = 1;
        if (porcentajeDestruccion >= 75) estrellas = 2;
        if (porcentajeDestruccion === 100) estrellas = 3;
        
        if (victoria) {
            this.datosJugador.victorias++;
            
            // XP según estrellas
            const xpGanada = 5 + (estrellas * 5); // 10, 15, o 20 XP
            this.datosJugador.experiencia += xpGanada;
            
            // Subir de liga cada 30 de experiencia
            if (this.datosJugador.experiencia >= 30) {
                this.datosJugador.experiencia = 0;
                this.datosJugador.ligaActual++;
                
                // Si pasamos liga III, subimos de rango
                if (this.datosJugador.ligaActual > 2) {
                    this.datosJugador.ligaActual = 0;
                    if (this.datosJugador.rangoActual < this.sistemRangos.rangos.length - 1) {
                        this.datosJugador.rangoActual++;
                        
                        // Verificar desbloqueo de dominios
                        const nuevoRango = this.sistemRangos.rangos[this.datosJugador.rangoActual];
                        if (nuevoRango.desbloquea && !this.datosJugador.dominiosDesbloqueados.includes(nuevoRango.desbloquea)) {
                            this.datosJugador.dominiosDesbloqueados.push(nuevoRango.desbloquea);
                            
                            // Desbloquear unidad y defensa gratis del nuevo dominio
                            const nuevoDominio = nuevoRango.desbloquea;
                            const unidadGratis = this.unidadesAtaque[nuevoDominio].unidades.find(u => u.precio === 0);
                            if (unidadGratis) {
                                this.datosJugador.unidadesDesbloqueadas[unidadGratis.id] = { nivel: 1 };
                            }
                            const defensaGratis = this.defensas[nuevoDominio].estructuras.find(d => d.precio === 0);
                            if (defensaGratis) {
                                this.datosJugador.defensasDesbloqueadas[defensaGratis.id] = { nivel: 1 };
                            }
                        }
                    }
                }
            }
        }
        
        this.actualizarMonedas();
        this.actualizarPerfilStats();
        
        // ⭐ Guardar progreso después de cada partida
        this.guardarProgreso();
        
        const rangoInfo = this.getRangoInfo();
        
        // Generar estrellas visualmente
        let estrellasHTML = '';
        for (let i = 0; i < 3; i++) {
            if (i < estrellas) {
                estrellasHTML += '<span style="font-size: 2.5rem; color: #FFD700; text-shadow: 0 0 10px #FFD700;">⭐</span>';
            } else {
                estrellasHTML += '<span style="font-size: 2.5rem; color: #555; opacity: 0.4;">⭐</span>';
            }
        }
        
        setTimeout(() => {
            this.mostrarModal(`
                <div style="text-align: center;">
                    <h2 style="color: ${victoria ? '#28a745' : '#dc3545'};">${victoria ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}</h2>
                    
                    <div style="margin: 15px 0;">
                        ${estrellasHTML}
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; margin: 10px 0;">
                        <p style="font-size: 1.5rem; color: #fff; margin: 0;">
                            <span style="color: ${porcentajeDestruccion >= 50 ? '#28a745' : '#dc3545'};">
                                ${porcentajeDestruccion}%
                            </span> destruido
                        </p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <p style="font-size: 1.1rem; color: var(--color-plata);">Recompensas obtenidas:</p>
                        <p style="color: #FFD700; font-size: 1.3rem; font-weight: bold;">+${oroGanado} 💰 Oro</p>
                        ${diamantesGanados > 0 ? `<p style="color: #87CEEB; font-size: 1.1rem;">+${diamantesGanados} 💎 Diamantes</p>` : ''}
                        ${victoria ? `<p style="color: #90EE90;">+${5 + (estrellas * 5)} XP</p>` : ''}
                    </div>
                    
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; margin: 15px 0;">
                        <p style="color: var(--color-plata); margin: 5px 0;">Tu rango actual:</p>
                        <p style="font-size: 1.3rem; margin: 5px 0;">${rangoInfo.emoji} ${rangoInfo.nombreCompleto}</p>
                    </div>
                    
                    <button class="btn btn-primary mt-3" onclick="$('#miModal').modal('hide'); cw.mostrarMenuDominio('${dominio}');">
                        Continuar
                    </button>
                </div>
            `);
        }, 500);
    }

    // ==========================================
    // CALLBACKS WEBSOCKET
    // ==========================================
    
    this.jugadorUnido = function(datos) {
        this.mostrarMensaje(`🎮 ¡${datos.email} se ha unido!`);
        const dominio = this.dominioMultijugador || 'tierra';
        this.datosRival.email = datos.email;
        
        // El host inicia el juego
        this.iniciarJuego2DMulti(dominio, datos.email, true);
    }
    
    this.unidoAPartida = function(datos) {
        this.mostrarMensaje(`✅ Te has unido a la partida ${datos.codigo}`);
        const dominio = this.dominioMultijugador || 'tierra';
        this.datosRival.email = datos.creador || 'Rival';
        
        // El invitado inicia el juego
        this.iniciarJuego2DMulti(dominio, datos.creador, false);
    }
    
    // Iniciar juego 2D en modo multijugador
    this.iniciarJuego2DMulti = function(dominio, rival, esHost) {
        // Configurar el juego
        this.iniciarJuego2D(dominio, 'multi', rival);
        
        // Configurar turno inicial
        setTimeout(() => {
            if (esHost) {
                // Host ataca primero
                this.juegoActual.turno = 'jugador';
                $('#turnIndicator').removeClass('enemy-turn').addClass('your-turn');
                $('#turnText').text('⚔️ TU TURNO - Selecciona y ataca');
                $('#btnAtacar').prop('disabled', false);
            } else {
                // Invitado espera
                this.juegoActual.turno = 'enemigo';
                $('#turnIndicator').removeClass('your-turn').addClass('enemy-turn');
                $('#turnText').text('⏳ TURNO DEL RIVAL - Esperando...');
                $('#btnAtacar').prop('disabled', true);
            }
            
            // Enviar nuestra base defensiva al rival
            const defensas = this.datosJugador.defensasDesbloqueadas;
            const estructuras = this.defensas[dominio].estructuras.filter(d => defensas[d.id]);
            ws.enviarBase(Object.keys(defensas), estructuras);
            
            // Marcar como listo
            this.juegoActual.listo = true;
            ws.listoParaJugar(dominio);
        }, 500);
    }

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
    // FUNCIONES DE SINCRONIZACIÓN MULTIJUGADOR
    // ==========================================
    
    // Datos del rival en multijugador
    this.datosRival = {
        email: '',
        defensas: [],
        estructuras: [],
        listo: false
    };
    
    // Recibir la base defensiva del rival
    this.recibirBaseRival = function(datos) {
        console.log("Base del rival recibida:", datos);
        this.datosRival.email = datos.email;
        this.datosRival.defensas = datos.defensas || [];
        this.datosRival.estructuras = datos.estructuras || [];
        
        // Actualizar la visualización de la base enemiga
        if (this.juegoActual && this.juegoActual.modo === 'multi') {
            this.actualizarBaseEnemigaMulti();
        }
    }
    
    // Actualizar visualización de base enemiga con datos del rival
    this.actualizarBaseEnemigaMulti = function() {
        const estructuras = this.datosRival.estructuras;
        if (!estructuras || estructuras.length === 0) return;
        
        // Regenerar la base enemiga con las estructuras reales del rival
        const dominio = this.juegoActual.dominio;
        const iconosBase = {
            tierra: { centro: '🏰', muros: ['🧱', '🧱', '🧱'] },
            mar: { centro: '🏯', muros: ['🛟', '🛟', '🛟'] },
            aire: { centro: '🛡️', muros: ['📡', '📡', '📡'] }
        };
        const iconos = iconosBase[dominio];
        
        let html = '';
        html += `<div class="wall-section">`;
        iconos.muros.forEach((m, i) => {
            html += `<span class="wall-block" id="enemyWall${i}" data-health="50">${m}</span>`;
        });
        html += `</div>`;
        
        html += `<div class="village-slot occupied" style="grid-column: 3;" id="enemyCenter" data-health="150">
            <span>${iconos.centro}</span>
            <div class="slot-health"><div class="slot-health-fill" style="width: 100%"></div></div>
        </div>`;
        
        // Mostrar las defensas reales del rival
        estructuras.forEach((d, i) => {
            if (i < 3) {
                const col = i === 0 ? 1 : (i === 1 ? 5 : 3);
                const row = i === 2 ? 3 : 2;
                html += `<div class="village-slot occupied" style="grid-column: ${col}; grid-row: ${row};" id="enemyDef${i}" data-health="${d.vida || 80}">
                    <span>${d.emoji || '🔫'}</span>
                    <div class="slot-health"><div class="slot-health-fill" style="width: 100%"></div></div>
                </div>`;
            }
        });
        
        $('#enemyVillage').html(html);
    }
    
    // Rival está listo para jugar
    this.rivalListo = function(datos) {
        this.datosRival.listo = true;
        this.mostrarMensaje(`🎮 ${datos.email} está listo para jugar!`);
        
        // Si ambos están listos, comenzar partida
        if (this.juegoActual && this.juegoActual.listo) {
            this.comenzarPartidaMulti();
        }
    }
    
    // Comenzar partida multijugador
    this.comenzarPartidaMulti = function() {
        // Host empieza atacando
        if (ws.esHost) {
            this.juegoActual.turno = 'jugador';
            $('#turnIndicator').removeClass('enemy-turn').addClass('your-turn');
            $('#turnText').text('⚔️ TU TURNO - Selecciona y ataca');
            $('#btnAtacar').prop('disabled', false);
        } else {
            this.juegoActual.turno = 'enemigo';
            $('#turnIndicator').removeClass('your-turn').addClass('enemy-turn');
            $('#turnText').text('⏳ TURNO DEL RIVAL - Esperando...');
            $('#btnAtacar').prop('disabled', true);
        }
    }
    
    // Recibir ataque del rival
    this.recibirAtaque = function(datos) {
        console.log("Ataque recibido:", datos);
        const danio = datos.danio || 10;
        
        // Aplicar daño a nuestra base
        this.juegoActual.vidasJugador -= danio;
        if (this.juegoActual.vidasJugador < 0) this.juegoActual.vidasJugador = 0;
        
        // Animar ataque en pantalla
        this.animarAtaqueRecibido(datos.unidades, danio);
        
        // Actualizar UI
        this.actualizarUIVidas();
        
        // Verificar fin de partida
        if (this.juegoActual.vidasJugador <= 0) {
            this.finPartidaMulti(false);
        }
    }
    
    // Animar ataque recibido
    this.animarAtaqueRecibido = function(unidades, danio) {
        // Crear efecto visual de ataque
        const $combatZone = $('#combatZone');
        
        if (unidades && unidades.length > 0) {
            unidades.forEach(u => {
                const $unit = $(`<div class="attack-unit enemy-attack">${u.emoji || '⚔️'}</div>`);
                $combatZone.append($unit);
                
                // Animar hacia nuestra base
                setTimeout(() => {
                    $unit.addClass('attacking-down');
                }, 50);
                
                setTimeout(() => {
                    $unit.remove();
                }, 1500);
            });
        }
        
        // Efecto de daño en base del jugador
        $('#playerBase').addClass('taking-damage');
        setTimeout(() => {
            $('#playerBase').removeClass('taking-damage');
        }, 500);
        
        // Mostrar número de daño
        const $damage = $(`<div class="damage-number">-${danio}</div>`);
        $('#playerBase').append($damage);
        setTimeout(() => $damage.remove(), 1000);
    }
    
    // Nuestro turno comienza
    this.miTurno = function(datos) {
        console.log("Es mi turno:", datos);
        this.juegoActual.turno = 'jugador';
        this.juegoActual.vidasEnemigo = datos.vidaEnemigo;
        
        $('#turnIndicator').removeClass('enemy-turn').addClass('your-turn');
        $('#turnText').text('⚔️ TU TURNO - Selecciona y ataca');
        $('#btnAtacar').prop('disabled', false);
        
        // Actualizar vidas
        this.actualizarUIVidas();
        
        this.mostrarMensaje('⚔️ ¡Es tu turno!');
    }
    
    // Actualizar vidas desde sincronización
    this.actualizarVidas = function(datos) {
        // En multijugador las vidas están invertidas desde la perspectiva del otro
        this.juegoActual.vidasJugador = datos.vidaEnemigo;
        this.juegoActual.vidasEnemigo = datos.vidaJugador;
        this.actualizarUIVidas();
    }
    
    // Actualizar UI de vidas
    this.actualizarUIVidas = function() {
        const vidaJ = Math.max(0, this.juegoActual.vidasJugador);
        const vidaE = Math.max(0, this.juegoActual.vidasEnemigo);
        
        $('#playerHealth').css('width', vidaJ + '%');
        $('#playerHealthText').text(vidaJ + '%');
        $('#enemyHealth').css('width', vidaE + '%');
        $('#enemyHealthText').text(vidaE + '%');
    }
    
    // Partida terminada en multijugador
    this.partidaTerminadaMulti = function(datos) {
        const ganeYo = datos.ganador !== datos.email;
        this.finPartidaMulti(ganeYo);
    }
    
    // Finalizar partida multijugador (sin empates - siempre hay ganador)
    this.finPartidaMulti = function(victoria) {
        const dominio = this.juegoActual.dominio;
        const estadisticasPartida = this.juegoActual.estadisticas || {};
        
        // Actualizar estadísticas multijugador
        this.datosJugador.partidasJugadas++;
        if (!this.datosJugador.statsMulti) {
            this.datosJugador.statsMulti = { victorias: 0, derrotas: 0 };
        }
        
        let copasGanadas = 0;
        let oroGanado = 0;
        let xpGanada = 0;
        
        if (victoria) {
            this.datosJugador.victorias++;
            this.datosJugador.statsMulti.victorias++;
            copasGanadas = 22; // 22 copas por victoria
            oroGanado = 200;
            xpGanada = 50;
        } else {
            this.datosJugador.derrotas++;
            this.datosJugador.statsMulti.derrotas++;
            copasGanadas = -15; // RESTA 15 copas por derrota
            oroGanado = 50;
            xpGanada = 20;
        }
        
        // Actualizar copas (no bajar de 0)
        this.datosJugador.copas = Math.max(0, this.datosJugador.copas + copasGanadas);
        this.datosJugador.monedas += oroGanado;
        this.datosJugador.xp += xpGanada;
        
        // Verificar subida de nivel
        this.verificarSubidaNivel();
        
        // Verificar cambio de liga
        const cambioLiga = this.verificarCambioLiga();
        
        this.actualizarMonedas();
        this.actualizarPerfilStats();
        
        // Mostrar resultado con estadísticas
        const titulo = victoria ? '🏆 ¡VICTORIA!' : '💀 DERROTA';
        const color = victoria ? '#28a745' : '#dc3545';
        const copasTexto = copasGanadas >= 0 ? `+${copasGanadas}` : `${copasGanadas}`;
        
        // Construir HTML de estadísticas de la partida
        let statsHTML = '';
        if (dominio === 'tierra' && estadisticasPartida) {
            statsHTML = `
                <div class="partida-stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">🔫 Disparos</span>
                        <span class="stat-value">${estadisticasPartida.disparos || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🎯 Aciertos</span>
                        <span class="stat-value">${estadisticasPartida.aciertos || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">💥 Daño Total</span>
                        <span class="stat-value">${estadisticasPartida.danoTotal || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">⏱️ Turnos</span>
                        <span class="stat-value">${estadisticasPartida.turnos || 0}</span>
                    </div>
                </div>
            `;
        } else if (dominio === 'mar' && estadisticasPartida) {
            statsHTML = `
                <div class="partida-stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">💣 Disparos</span>
                        <span class="stat-value">${estadisticasPartida.disparos || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🎯 Aciertos</span>
                        <span class="stat-value">${estadisticasPartida.aciertos || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🚢 Barcos Hundidos</span>
                        <span class="stat-value">${estadisticasPartida.barcosHundidos || 0}</span>
                    </div>
                </div>
            `;
        } else if (dominio === 'aire' && estadisticasPartida) {
            statsHTML = `
                <div class="partida-stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">👾 Enemigos</span>
                        <span class="stat-value">${estadisticasPartida.enemigosEliminados || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🎯 Precisión</span>
                        <span class="stat-value">${estadisticasPartida.precision || 0}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">🌊 Oleadas</span>
                        <span class="stat-value">${estadisticasPartida.oleadas || 0}</span>
                    </div>
                </div>
            `;
        }
        
        // Mensaje de cambio de liga si aplica
        let ligaHTML = '';
        if (cambioLiga.cambio) {
            const direccion = cambioLiga.subio ? '⬆️ SUBISTE' : '⬇️ BAJASTE';
            const colorLiga = cambioLiga.subio ? '#00ff00' : '#ff6600';
            ligaHTML = `
                <div class="liga-cambio" style="color: ${colorLiga}; font-size: 1.2em; margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    ${direccion} a ${cambioLiga.nuevaLiga.emoji} ${cambioLiga.nuevaLiga.nombre}
                    ${cambioLiga.recompensa ? `<br>🎁 +${cambioLiga.recompensa} monedas` : ''}
                </div>
            `;
        }
        
        this.mostrarModal(`
            <div style="text-align: center;">
                <h2 style="color: ${color};">${titulo}</h2>
                
                ${statsHTML}
                
                <div class="recompensas-resumen" style="margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                    <h4>📊 Recompensas</h4>
                    <p style="color: ${copasGanadas >= 0 ? '#FFD700' : '#FF4444'};">Copas: ${copasTexto} 🏆</p>
                    <p>Oro: +${oroGanado} 💰</p>
                    <p>XP: +${xpGanada} ⭐</p>
                </div>
                
                ${ligaHTML}
                
                <button class="btn btn-primary mt-3" onclick="$('#miModal').modal('hide'); cw.mostrarMenuDominio('${dominio}');">
                    Continuar
                </button>
            </div>
        `);
        
        this.guardarProgreso();
    }
    
    // Verificar si cambió de liga y dar recompensas
    this.verificarCambioLiga = function() {
        const copas = this.datosJugador.copas;
        const ligaAnterior = this.datosJugador.ligaActual || 0;
        
        // Encontrar liga actual basada en copas
        let ligaActualIndex = 0;
        for (let i = this.sistemRangos.ligas.length - 1; i >= 0; i--) {
            if (copas >= this.sistemRangos.ligas[i].copasMin) {
                ligaActualIndex = i;
                break;
            }
        }
        
        const cambio = ligaActualIndex !== ligaAnterior;
        const subio = ligaActualIndex > ligaAnterior;
        
        let recompensa = 0;
        if (cambio && subio) {
            // Recompensa por subir de liga
            recompensa = this.sistemRangos.ligas[ligaActualIndex].recompensaSubir || 500;
            this.datosJugador.monedas += recompensa;
        }
        
        this.datosJugador.ligaActual = ligaActualIndex;
        
        return {
            cambio: cambio,
            subio: subio,
            nuevaLiga: this.sistemRangos.ligas[ligaActualIndex],
            recompensa: recompensa
        };
    }
    
    // Actualizar rango basado en copas
    this.actualizarRangoPorCopas = function() {
        const copas = this.datosJugador.copas;
        const rangos = this.sistemRangos.rangos;
        
        for (let i = rangos.length - 1; i >= 0; i--) {
            const rango = rangos[i];
            const puntosMenor = rango.puntos[0];
            if (copas >= puntosMenor) {
                this.datosJugador.rangoActual = i;
                
                // Determinar liga dentro del rango
                for (let j = rango.puntos.length - 1; j >= 0; j--) {
                    if (copas >= rango.puntos[j]) {
                        this.datosJugador.ligaActual = j;
                        break;
                    }
                }
                break;
            }
        }
    }
    
    // Rival abandonó la partida
    this.rivalAbandono = function() {
        if (this.juegoActual && this.juegoActual.modo === 'multi') {
            this.mostrarModal(`
                <div style="text-align: center;">
                    <h2 style="color: #28a745;">🏆 ¡VICTORIA!</h2>
                    <p>Tu rival ha abandonado la partida.</p>
                    <p>+30 🏆 Copas | +100 💰 Oro</p>
                    <button class="btn btn-primary mt-3" onclick="$('#miModal').modal('hide'); cw.mostrarMenuPrincipal();">
                        Continuar
                    </button>
                </div>
            `);
            
            this.datosJugador.victorias++;
            this.datosJugador.copas += 30;
            this.datosJugador.monedas += 100;
            this.actualizarMonedas();
            this.actualizarPerfilStats();
        }
    }
    
    // Mostrar mensaje de chat
    this.mostrarMensajeChat = function(datos) {
        this.mostrarMensaje(`💬 ${datos.email}: ${datos.mensaje}`);
    }
    
    // ==========================================
    // SISTEMA DE ROOMS - HANDLERS
    // ==========================================
    
    // Handler cuando se crea una room
    this.onRoomCreada = function(datos) {
        console.log("🏠 Room creada callback:", datos);
        this.roomActual = datos;
        
        // Mostrar pantalla de espera
        const dominio = datos.dominio || this.dominioActual || 'tierra';
        const temas = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };
        
        const emojis = {
            tierra: '🎖️',
            mar: '🚢',
            aire: '✈️'
        };
        
        const gameModeNames = {
            tankStars: 'Tank Stars',
            batallaNaval: 'Batalla Naval',
            spaceInvaders: 'Space Invaders'
        };
        
        const html = `
            <div class="game-panel ${temas[dominio]}">
                <div class="waiting-screen">
                    <h3 class="waiting-title">⏳ Esperando Rival...</h3>
                    <div class="spinner"></div>
                    
                    <div class="room-code-display" style="margin: 20px 0;">
                        <p style="color: #888; margin-bottom: 5px;">Código de Sala:</p>
                        <div style="background: rgba(0,0,0,0.5); padding: 15px 30px; border-radius: 10px; display: inline-block;">
                            <span style="font-size: 2rem; font-weight: bold; color: #fff; letter-spacing: 3px;">${datos.roomId}</span>
                        </div>
                        <button style="margin-left: 10px; padding: 10px 15px; cursor: pointer; border: none; background: #4CAF50; color: #fff; border-radius: 5px;" 
                                onclick="navigator.clipboard.writeText('${datos.roomId}'); cw.mostrarMensaje('📋 Código copiado!');">
                            📋 Copiar
                        </button>
                    </div>
                    
                    <p style="color: var(--color-plata);">Comparte este código con tu rival</p>
                    
                    <div style="margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                        <p style="color: #888; margin-bottom: 10px;">Modo de juego:</p>
                        <div style="font-size: 2rem;">${emojis[dominio]}</div>
                        <div style="color: #fff; font-weight: 700;">${gameModeNames[datos.gameMode] || datos.gameMode}</div>
                    </div>
                    
                    <button class="btn-back" id="btnCancelarRoom" style="margin-top: 20px;">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;
        
        this.limpiar();
        $("#au").html(html);
        
        $("#btnCancelarRoom").on("click", function() {
            if (ws) ws.salirRoom();
            cw.mostrarPanelMultijugadorDominio(dominio);
        });
    }
    
    // Handler cuando nos unimos a una room
    this.onUnidoARoom = function(datos) {
        console.log("👥 Unido a room callback:", datos);
        this.roomActual = datos;
        
        // Ir a selección de personaje
        this.mostrarSeleccionPersonajeRoom(datos);
    }
    
    // Handler cuando otro jugador se une a nuestra room
    this.onJugadorUnido = function(datos) {
        console.log("👤 Jugador unido callback:", datos);
        this.mostrarMensaje(`👤 ${datos.email} se ha unido!`);
        
        // Ir a selección de personaje (como host)
        if (this.roomActual) {
            this.roomActual.jugadores = datos.jugadores;
        }
        this.mostrarSeleccionPersonajeRoom({
            ...this.roomActual,
            rivalEmail: datos.email
        });
    }
    
    // Handler cuando un jugador sale
    this.onJugadorSalio = function(datos) {
        console.log("👋 Jugador salió:", datos.email);
        this.mostrarMensaje(`${datos.email} ha salido de la sala`);
    }
    
    // Mostrar lista de rooms disponibles
    this.mostrarListaRooms = function(lista) {
        const container = $("#listaRooms");
        if (!container.length) return;
        
        if (!lista || lista.length === 0) {
            container.html(`
                <p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">
                    No hay salas disponibles. ¡Crea una!
                </p>
            `);
            return;
        }
        
        const emojis = {
            tierra: '🎖️',
            mar: '🚢',
            aire: '✈️'
        };
        
        const gameModeNames = {
            tankStars: 'Tank Stars',
            batallaNaval: 'Batalla Naval',
            spaceInvaders: 'Space Invaders'
        };
        
        let html = '';
        lista.forEach(room => {
            html += `
                <div class="match-item room-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: rgba(0,0,0,0.3); border-radius: 10px;">
                    <div class="room-info" style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.5rem;">${emojis[room.dominio] || '🎮'}</span>
                            <div>
                                <div style="font-weight: 700; color: #fff;">${gameModeNames[room.gameMode] || room.gameMode}</div>
                                <div style="color: #888; font-size: 0.9rem;">
                                    👤 ${room.creador} | 📍 Código: ${room.roomId}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button class="btn-join-match" style="background: #4CAF50; border: none; color: #fff; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 700;"
                            onclick="ws.unirRoom('${room.roomId}')">
                        Unirse
                    </button>
                </div>
            `;
        });
        
        container.html(html);
    }
    
    // Selección de personaje en sistema de Rooms
    this.mostrarSeleccionPersonajeRoom = function(datos) {
        const dominio = datos.dominio || this.dominioActual || 'tierra';
        const gameMode = datos.gameMode;
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        
        // Tropas disponibles
        const tropasDisponibles = tropas.filter(t => 
            t.desbloqueado || this.datosJugador.tropasDesbloqueadas?.[t.id]
        );
        
        const temas = {
            tierra: 'domain-theme-land',
            mar: 'domain-theme-sea',
            aire: 'domain-theme-air'
        };
        
        const nombreUnidad = dominio === 'tierra' ? 'Tanque/Soldado' : dominio === 'mar' ? 'Barco' : 'Nave';
        const rivalEmail = datos.rivalEmail || datos.creador || 'Rival';
        const esHost = ws && ws.esHost;
        
        const html = `
            <div class="game-panel ${temas[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">🎯 Elige tu ${nombreUnidad}</h2>
                </div>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <p style="color: #aaa;">⚔️ vs ${esHost ? rivalEmail : datos.creador}</p>
                    <p style="color: #666; font-size: 0.9rem;">Sala: ${datos.roomId}</p>
                </div>
                
                <div class="tropas-selection-grid" style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                    ${tropasDisponibles.map(tropa => `
                        <div class="tropa-select-card rareza-${tropa.rareza.toLowerCase()}" 
                             data-tropa="${tropa.id}" 
                             style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; cursor: pointer; text-align: center; min-width: 150px; transition: all 0.3s;"
                             onclick="cw.seleccionarTropaRoom('${tropa.id}')">
                            <div class="tropa-emoji" style="font-size: 3rem;">${tropa.emoji}</div>
                            <div class="tropa-nombre" style="font-weight: 700; margin: 10px 0; color: #fff;">${tropa.nombre}</div>
                            <div class="tropa-stats" style="color: #aaa; font-size: 0.9rem;">
                                ❤️${tropa.stats.vida} ⚡${tropa.stats.velocidad}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div id="rivalSeleccion" style="text-align: center; margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px;">
                    <p style="color: #888;">⏳ Esperando que el rival seleccione...</p>
                </div>
                
                <div class="selection-actions" style="text-align: center; margin-top: 20px;">
                    <button class="btn-iniciar-combate ${dominio}" id="btnListoRoom" disabled
                            style="padding: 15px 40px; font-size: 1.2rem; cursor: pointer;">
                        ✅ ¡LISTO!
                    </button>
                    <p id="seleccionInfo" style="color: #888; margin-top: 10px;">
                        Selecciona tu personaje
                    </p>
                </div>
            </div>
        `;
        
        this.limpiar();
        $("#au").html(html);
        
        this.tropaRoomSeleccionada = null;
        this.rivalListoRoom = false;
        
        $("#btnListoRoom").on("click", function() {
            if (cw.tropaRoomSeleccionada && ws) {
                ws.marcarListo();
                $(this).prop('disabled', true).text('⏳ Esperando rival...');
            }
        });
    }
    
    // Seleccionar tropa en sistema de Rooms
    this.seleccionarTropaRoom = function(tropaId) {
        const dominio = this.dominioActual || 'tierra';
        const tropas = this.unidadesAtaque[dominio]?.tropas || [];
        const tropa = tropas.find(t => t.id === tropaId);
        if (!tropa) return;
        
        // UI feedback
        $('.tropa-select-card').css({
            'border': '2px solid transparent',
            'transform': 'scale(1)'
        });
        $(`.tropa-select-card[data-tropa="${tropaId}"]`).css({
            'border': '2px solid #4CAF50',
            'transform': 'scale(1.05)'
        });
        
        this.tropaRoomSeleccionada = tropa;
        
        // Habilitar botón
        $('#btnListoRoom').prop('disabled', false);
        $('#seleccionInfo').html(`<span style="color: #4CAF50;">✅ ${tropa.emoji} ${tropa.nombre} seleccionado</span>`);
        
        // Enviar selección al servidor
        if (ws) {
            ws.seleccionarPersonaje(tropaId, tropa.emoji, tropa.nombre);
        }
    }
    
    // Handler cuando rival selecciona personaje
    this.onRivalSeleccionoPersonaje = function(datos) {
        $('#rivalSeleccion').html(`
            <p style="color: #4CAF50;">
                ✅ ${datos.email} eligió: ${datos.tropaEmoji} ${datos.tropaNombre}
            </p>
        `);
        this.rivalTropaRoom = datos;
    }
    
    // Handler cuando rival está listo
    this.onRivalListo = function(datos) {
        this.rivalListoRoom = true;
        this.mostrarMensaje('✅ ¡El rival está listo!');
    }
    
    // Handler cuando ambos están listos - iniciar partida
    this.onIniciarPartida = function(datos) {
        console.log("🚀 Iniciando partida:", datos);
        
        this.roomActual = datos;
        const gameMode = datos.gameMode;
        const dominio = datos.dominio;
        const miEmail = $.cookie('nick');
        const esMiTurno = datos.turnoInicial === miEmail;
        
        // Guardar datos del juego actual
        this.juegoMultiActual = {
            roomId: datos.roomId,
            gameMode: gameMode,
            dominio: dominio,
            jugadores: datos.jugadores,
            miTropa: this.tropaRoomSeleccionada,
            rivalTropa: this.rivalTropaRoom,
            turnoActual: datos.turnoInicial,
            esMiTurno: esMiTurno,
            selecciones: datos.selecciones
        };
        
        // Iniciar el minijuego correspondiente
        switch(gameMode) {
            case 'tankStars':
            case 'tankstars':
                this.iniciarTankStarsMulti(datos);
                break;
            case 'spaceInvaders':
            case 'spaceinvaders':
                this.iniciarSpaceInvadersMulti(datos);
                break;
            case 'batallaNaval':
            case 'batallanaval':
                this.iniciarBatallaNavalMulti(datos);
                break;
            default:
                console.error("Modo de juego desconocido:", gameMode);
                this.mostrarMensaje("Error: Modo de juego no reconocido");
        }
    }
    
    // ==========================================
    // INICIALIZADORES DE MINIJUEGOS MULTI
    // ==========================================
    
    // Iniciar Tank Stars Multijugador
    this.iniciarTankStarsMulti = function(datos) {
        console.log("🎮 Iniciando Tank Stars Multi:", datos);
        const dominio = datos.dominio || 'tierra';
        this.dominioActual = dominio;
        
        const miEmail = $.cookie('nick');
        const miTropa = this.tropaRoomSeleccionada || this.unidadesAtaque.tierra.tropas[0];
        const rivalTropa = this.rivalTropaRoom || { tropaId: 'tank_abrams', tropaEmoji: '🛡️', tropaNombre: 'Abrams' };
        
        // Buscar datos de la tropa rival
        const tropasDisponibles = this.unidadesAtaque.tierra.tropas;
        const rivalTropaData = tropasDisponibles.find(t => t.id === rivalTropa.tropaId) || tropasDisponibles[0];
        
        // Seleccionar mapa aleatorio o específico
        const mapas = this.mapasShooter?.tierra || [];
        const mapaSeleccionado = datos.mapaId ? 
            mapas.find(m => m.id === datos.mapaId) : 
            mapas[Math.floor(Math.random() * mapas.length)] || { 
                id: 'desierto', nombre: 'Desierto', emoji: '🏜️', 
                config: { ancho: 1200, alto: 600, tipoTerreno: 'dunas' } 
            };
        
        // Guardar datos para uso en el juego
        this.tankMultiData = {
            miTropa: miTropa,
            rivalTropa: rivalTropaData,
            roomId: datos.roomId,
            miEmail: miEmail,
            rivalEmail: datos.jugadores.find(j => j !== miEmail),
            turnoInicial: datos.turnoInicial,
            mapa: mapaSeleccionado
        };
        
        // Iniciar el juego normalmente con el mapa seleccionado
        this.iniciarTankStars(miTropa.id, mapaSeleccionado.id);
        
        // Modificar para multijugador
        if (this.tankGame) {
            this.tankGame.esMulti = true;
            this.tankGame.roomId = datos.roomId;
            this.tankGame.turno = datos.turnoInicial === miEmail ? 'jugador' : 'enemigo';
            this.tankGame.fase = this.tankGame.turno === 'jugador' ? 'mover' : 'espera';
            
            // Configurar enemigo con la tropa del rival
            this.tankGame.enemigo.tropa = rivalTropaData;
            this.tankGame.enemigo.vida = rivalTropaData.stats?.vida || 100;
            this.tankGame.enemigo.vidaMax = rivalTropaData.stats?.vida || 100;
            this.tankGame.enemigo.armadura = rivalTropaData.stats?.armadura || 0;
            this.tankGame.enemigo.combustible = rivalTropaData.stats?.combustible || 100;
            this.tankGame.enemigo.combustibleMax = rivalTropaData.stats?.combustible || 100;
            this.tankGame.enemigo.municion = this.copiarMunicion(rivalTropaData.armas || []);
            
            // Actualizar nombre del rival en la UI
            setTimeout(() => {
                // Actualizar nombre del enemigo en la interfaz
                $('.tank-player-info.enemy .tank-name').text(rivalTropaData.nombre);
                $('.tank-player-info.enemy .tank-emoji').text(rivalTropaData.emoji);
                
                // Forzar actualización de la UI
                this.actualizarTurnoMultiTank();
                this.actualizarUIFase();
                this.actualizarHUDTank();
                
                // Log para debug
                console.log("🎮 Tank Stars Multi configurado:", {
                    turno: this.tankGame.turno,
                    fase: this.tankGame.fase,
                    esMiTurno: this.tankGame.turno === 'jugador'
                });
            }, 600);
            
            // Segunda actualización por si acaso
            setTimeout(() => {
                this.actualizarTurnoMultiTank();
            }, 1200);
        }
    }
    
    // Actualizar indicador de turno en Tank Stars Multi
    this.actualizarTurnoMultiTank = function() {
        if (!this.tankGame || !this.tankGame.esMulti) return;
        
        const esMiTurno = this.tankGame.turno === 'jugador';
        const game = this.tankGame;
        
        // Actualizar indicador visual
        if (esMiTurno) {
            $('#turnoIndicador').html('🎯 TU TURNO').removeClass('enemy').addClass('player');
            $('#turnoIndicador').css('background', 'rgba(76,175,80,0.9)');
        } else {
            $('#turnoIndicador').html('⏳ TURNO DEL RIVAL').removeClass('player').addClass('enemy');
            $('#turnoIndicador').css('background', 'rgba(255,87,34,0.9)');
        }
        
        // Habilitar/deshabilitar controles según turno y fase
        if (esMiTurno) {
            if (game.fase === 'mover') {
                $('#btnMoverIzq, #btnMoverDer').prop('disabled', false);
                $('#btnFinMover').prop('disabled', false);
                $('#btnDisparar').prop('disabled', true);
            } else if (game.fase === 'apuntar') {
                $('#btnMoverIzq, #btnMoverDer, #btnFinMover').prop('disabled', true);
                $('#btnDisparar').prop('disabled', false);
            }
        } else {
            $('#btnMoverIzq, #btnMoverDer, #btnFinMover, #btnDisparar').prop('disabled', true);
        }
    }
    
    // Handler para recibir disparo de Tank Stars
    this.recibirDisparoTank = function(datos) {
        console.log("💥 Procesando disparo rival:", datos);
        
        if (!this.tankGame || !this.tankGame.esMulti) return;
        
        const { angulo, potencia, armaId } = datos;
        
        // Configurar el disparo del enemigo
        this.tankGame.enemigo.angulo = angulo;
        this.tankGame.enemigo.potencia = potencia;
        this.tankGame.enemigo.armaActual = armaId || 0;
        
        // Ejecutar disparo del enemigo
        this.simularDisparoEnemigoMulti(angulo, potencia, armaId);
    }
    
    // Simular disparo del enemigo en multijugador
    this.simularDisparoEnemigoMulti = function(angulo, potencia, armaId) {
        const game = this.tankGame;
        if (!game) return;
        
        const enemigo = game.enemigo;
        const arma = enemigo.tropa?.armas?.[armaId || 0] || { daño: 15, proyectilVelocidad: 12 };
        
        // Calcular velocidad inicial
        const velocidadBase = arma.proyectilVelocidad || 15;
        const velocidad = (potencia / 100) * velocidadBase * 0.8;
        const anguloRad = angulo * Math.PI / 180; // Ángulo ya viene correcto del rival
        
        // Crear proyectil desde posición del enemigo
        game.proyectil = {
            x: enemigo.x,
            y: enemigo.y - 30,
            vx: Math.cos(anguloRad) * velocidad,
            vy: Math.sin(anguloRad) * velocidad,
            radio: arma.tipo === 'cañon' ? 12 : 8,
            daño: arma.daño || 15,
            alcanceMax: arma.alcance || 400,
            distanciaRecorrida: 0,
            propietario: 'enemigo',
            rastro: [],
            tipoArma: arma.tipo || 'cañon',
            explosivo: arma.tipo === 'cañon' || arma.tipo === 'cohetes',
            radioExplosion: arma.tipo === 'cañon' ? 60 : 40
        };
        
        // Mostrar mensaje
        this.mostrarMensajeTank('💥', '¡El rival disparó!', 1000);
    }
    
    // Recibir movimiento del rival en Tank Stars
    this.recibirMovimientoTank = function(datos) {
        console.log("🚗 Movimiento rival:", datos);
        
        if (!this.tankGame || !this.tankGame.esMulti) return;
        
        const { nuevaX, nuevaY, combustibleRestante } = datos;
        
        // Animar movimiento del enemigo
        const game = this.tankGame;
        const enemigo = game.enemigo;
        const startX = enemigo.x;
        const targetX = nuevaX;
        const steps = 20;
        let step = 0;
        
        const animarMov = () => {
            step++;
            enemigo.x = startX + (targetX - startX) * (step / steps);
            enemigo.y = this.getAlturaTerreno(enemigo.x) - 30;
            enemigo.combustible = combustibleRestante;
            
            if (step < steps) {
                requestAnimationFrame(animarMov);
            }
        };
        animarMov();
    }
    
    // 🌐 Recibir apuntado del rival en tiempo real
    this.recibirApuntadoTank = function(datos) {
        if (!this.tankGame || !this.tankGame.esMulti) return;
        
        const { angulo, potencia } = datos;
        const game = this.tankGame;
        
        // Actualizar ángulo y potencia del enemigo para visualización
        game.enemigo.angulo = angulo;
        game.enemigo.potencia = potencia;
        game.anguloEnemigo = angulo; // Para el cañón
        
        console.log(`🎯 Rival apuntando: ${angulo}°, ${potencia}%`);
    }
    
    // Recibir uso de superpoder del rival
    this.recibirSuperpoderTank = function(datos) {
        console.log("⚡ Superpoder rival:", datos);
        
        if (!this.tankGame) return;
        
        const { superpoderTipo, objetivo } = datos;
        
        // Mostrar efecto visual del superpoder del enemigo
        this.mostrarMensajeTank('⚡', `¡El rival usó ${superpoderTipo}!`, 2000);
        
        // Ejecutar efecto según tipo
        this.ejecutarSuperpoderEnemigoMulti(superpoderTipo, objetivo);
    }
    
    // Ejecutar superpoder del enemigo
    this.ejecutarSuperpoderEnemigoMulti = function(tipo, objetivo) {
        const game = this.tankGame;
        if (!game) return;
        
        switch(tipo) {
            case 'Bombardeo Masivo':
            case 'Artillería Pesada':
                // Crear explosiones en área
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        const x = game.jugador.x + (Math.random() - 0.5) * 200;
                        const y = this.getAlturaTerreno(x);
                        game.explosiones.push({ x, y, radio: 50, progreso: 0, grande: true });
                    }, i * 200);
                }
                break;
                
            case 'Escudo Reflector':
            case 'Escudo de Hielo':
                // Efecto visual de escudo en enemigo
                game.enemigo.efectos.push({ tipo: 'escudo', duracion: 2 });
                break;
                
            case 'Carga Atómica':
            case 'Lluvia Nuclear':
                // Gran explosión
                setTimeout(() => {
                    const x = game.jugador.x;
                    const y = this.getAlturaTerreno(x);
                    game.explosiones.push({ x, y, radio: 150, progreso: 0, grande: true, nuclear: true });
                    game.jugador.vida -= 30;
                    this.actualizarHUDTank();
                }, 500);
                break;
        }
    }
    
    // Sincronizar vida desde el servidor
    this.sincronizarVidaTank = function(datos) {
        if (!this.tankGame) return;
        
        const miEmail = $.cookie('nick');
        
        // El emisor envía vidaJugador=suVida, vidaEnemigo=nuestraVida
        // Así que para nosotros es al revés
        if (datos.emisor !== miEmail) {
            // Los datos vienen del rival, su jugador es nuestro enemigo
            this.tankGame.enemigo.vida = datos.vidaJugador;
            this.tankGame.jugador.vida = datos.vidaEnemigo;
            this.actualizarHUDTank();
        }
    }
    
    // Handler para resultado de disparo Tank
    this.recibirResultadoDisparoTank = function(datos) {
        console.log("🎯 Resultado recibido:", datos);
        // El resultado se procesa localmente, sincronizamos vida
        if (this.tankGame && datos.vidaRestante !== undefined) {
            if (datos.esJugador) {
                this.tankGame.jugador.vida = datos.vidaRestante;
            } else {
                this.tankGame.enemigo.vida = datos.vidaRestante;
            }
            this.actualizarHUDTank();
        }
    }
    
    // Handler para nuevo turno en Tank Stars
    this.onNuevoTurnoTank = function(datos) {
        console.log("🔄 Nuevo turno:", datos);
        
        if (!this.tankGame || !this.tankGame.esMulti) return;
        
        const miEmail = $.cookie('nick');
        const game = this.tankGame;
        
        game.turno = datos.turnoActual === miEmail ? 'jugador' : 'enemigo';
        game.viento = datos.viento ?? game.viento;
        game.turnoNumero = datos.turnoNumero ?? (game.turnoNumero + 1);
        
        if (game.turno === 'jugador') {
            game.fase = 'mover';
            // Restaurar combustible parcialmente
            game.jugador.combustible = Math.min(game.jugador.combustibleMax, game.jugador.combustible + 30);
            this.actualizarUIFase();
        } else {
            game.fase = 'espera';
        }
        
        // Actualizar UI
        this.actualizarTurnoMultiTank();
        $('#turnoNumero').text(game.turnoNumero);
        $('#vientoValor').text((game.viento > 0 ? '→ ' : '← ') + Math.abs(game.viento * 10).toFixed(1));
        
        this.mostrarMensajeTank(
            game.turno === 'jugador' ? '🎯' : '⏳',
            game.turno === 'jugador' ? '¡Tu turno!' : 'Turno del rival',
            1500
        );
    }
    
    // Enviar movimiento al servidor
    this.enviarMovimientoTankMulti = function() {
        if (!this.tankGame || !this.tankGame.esMulti || !ws) return;
        
        const game = this.tankGame;
        ws.emit('tankMovimiento', {
            roomId: game.roomId,
            email: $.cookie('nick'),
            nuevaX: game.jugador.x,
            nuevaY: game.jugador.y,
            combustibleRestante: game.jugador.combustible
        });
    }
    
    // ==========================================
    // SPACE INVADERS MULTIJUGADOR - DOGFIGHT 1v1
    // ==========================================
    
    this.iniciarSpaceInvadersMulti = function(datos) {
        console.log("🚀 Iniciando Dogfight Aéreo 1v1:", datos);
        
        const miEmail = $.cookie('nick');
        const miTropa = this.tropaRoomSeleccionada || this.unidadesAtaque.aire?.tropas?.[0];
        const rivalTropa = this.rivalTropaRoom || { tropaId: 'caza', tropaEmoji: '✈️', tropaNombre: 'Caza F-16' };
        
        // Ocultar UI principal
        $('.game-container').hide();
        $('#googleSigninContainer').hide();
        $('#rankingPanel').hide();
        $('#profileIcon').hide();
        
        const W = 800;
        const H = 700;
        
        // Aviones disponibles
        const avionesDisponibles = [
            { id: 'caza', nombre: 'Caza F-16', emoji: '✈️', vida: 3, velocidad: 8, cadencia: 250, daño: 1 },
            { id: 'bombardero', nombre: 'B-52 Bomber', emoji: '🛩️', vida: 5, velocidad: 5, cadencia: 500, daño: 2 },
            { id: 'helicoptero', nombre: 'Apache AH-64', emoji: '🚁', vida: 4, velocidad: 6, cadencia: 200, daño: 1 },
            { id: 'drone', nombre: 'MQ-9 Reaper', emoji: '🛸', vida: 2, velocidad: 10, cadencia: 150, daño: 1 },
            { id: 'cohete', nombre: 'X-15 Rocket', emoji: '🚀', vida: 3, velocidad: 9, cadencia: 300, daño: 2 }
        ];
        
        const miAvion = avionesDisponibles.find(a => a.id === miTropa?.id) || avionesDisponibles[0];
        const rivalAvion = avionesDisponibles.find(a => a.id === rivalTropa.tropaId) || avionesDisponibles[1];
        
        // Determinar quién está arriba/abajo
        const soyHost = datos.turnoInicial === miEmail;
        
        // Estado del juego 1v1 Dogfight
        this.spaceGameMulti = {
            activo: true,
            esMulti: true,
            modo: 'dogfight',
            roomId: datos.roomId,
            miEmail: miEmail,
            rivalEmail: datos.jugadores.find(j => j !== miEmail),
            esHost: soyHost,
            
            // Tiempo límite: 2 minutos
            tiempoInicio: Date.now(),
            tiempoLimite: 2 * 60 * 1000,
            
            W: W,
            H: H,
            
            // Mi nave (abajo si soy host, arriba si no)
            miNave: {
                x: W / 2,
                y: soyHost ? H - 80 : 80,
                ancho: 50,
                alto: 40,
                velocidad: miAvion.velocidad,
                emoji: miAvion.emoji,
                nombre: miAvion.nombre,
                vida: miAvion.vida,
                vidaMax: miAvion.vida,
                cadencia: miAvion.cadencia,
                daño: miAvion.daño,
                direccionDisparo: soyHost ? -1 : 1, // Arriba o abajo
                invulnerable: 0
            },
            
            // Nave rival (opuesto)
            rivalNave: {
                x: W / 2,
                y: soyHost ? 80 : H - 80,
                ancho: 50,
                alto: 40,
                velocidad: rivalAvion.velocidad,
                emoji: rivalAvion.emoji,
                nombre: rivalAvion.nombre,
                vida: rivalAvion.vida,
                vidaMax: rivalAvion.vida,
                direccionDisparo: soyHost ? 1 : -1,
                invulnerable: 0
            },
            
            // Proyectiles
            misProyectiles: [],
            proyectilesRival: [],
            
            // Powerups que caen
            powerups: [],
            ultimoPowerup: 0,
            
            // Efectos visuales
            explosiones: [],
            estrellas: [],
            particulas: [],
            
            // Controles
            keys: { left: false, right: false, up: false, down: false, space: false },
            ultimoDisparo: 0,
            
            avionesDisponibles: avionesDisponibles,
            canvas: null,
            ctx: null,
            animationFrame: null
        };
        
        // Generar estrellas de fondo
        this.generarEstrellasSpaceMulti();
        
        // Crear interfaz
        this.crearInterfazDogfight();
        
        // Iniciar controles
        this.iniciarControlesSpaceMulti();
        
        // Iniciar loop
        this.gameLoopSpaceMulti();
    }
    
    // Generar estrellas para Space Multi
    this.generarEstrellasSpaceMulti = function() {
        const game = this.spaceGameMulti;
        game.estrellas = [];
        for (let i = 0; i < 100; i++) {
            game.estrellas.push({
                x: Math.random() * game.W,
                y: Math.random() * game.H,
                tamaño: Math.random() * 2 + 0.5,
                velocidad: Math.random() * 0.5 + 0.2,
                brillo: Math.random()
            });
        }
    }
    
    // Crear interfaz Dogfight 1v1
    this.crearInterfazDogfight = function() {
        const game = this.spaceGameMulti;
        
        const html = `
            <div class="space-invaders-container dogfight" id="spaceInvadersMulti">
                <div class="dogfight-hud">
                    <div class="dogfight-player top ${!game.esHost ? 'me' : 'rival'}">
                        <span class="plane-emoji">${!game.esHost ? game.miNave.emoji : game.rivalNave.emoji}</span>
                        <span class="player-label">${!game.esHost ? 'TÚ' : 'RIVAL'}</span>
                        <div class="vida-container">
                            <div class="vida-bar">
                                <div class="vida-fill ${!game.esHost ? 'player' : 'enemy'}" id="${!game.esHost ? 'miVida' : 'rivalVida'}" 
                                     style="width: 100%"></div>
                            </div>
                            <span class="vida-text" id="${!game.esHost ? 'miVidaText' : 'rivalVidaText'}">
                                ${!game.esHost ? game.miNave.vida : game.rivalNave.vida}/${!game.esHost ? game.miNave.vidaMax : game.rivalNave.vidaMax}
                            </span>
                        </div>
                    </div>
                    
                    <div class="dogfight-center">
                        <div class="timer-box">⏱️ <span id="dogfightTimer">2:00</span></div>
                        <div class="vs-badge">⚔️ VS</div>
                    </div>
                    
                    <div class="dogfight-player bottom ${game.esHost ? 'me' : 'rival'}">
                        <span class="plane-emoji">${game.esHost ? game.miNave.emoji : game.rivalNave.emoji}</span>
                        <span class="player-label">${game.esHost ? 'TÚ' : 'RIVAL'}</span>
                        <div class="vida-container">
                            <div class="vida-bar">
                                <div class="vida-fill ${game.esHost ? 'player' : 'enemy'}" id="${game.esHost ? 'miVida' : 'rivalVida'}" 
                                     style="width: 100%"></div>
                            </div>
                            <span class="vida-text" id="${game.esHost ? 'miVidaText' : 'rivalVidaText'}">
                                ${game.esHost ? game.miNave.vida : game.rivalNave.vida}/${game.esHost ? game.miNave.vidaMax : game.rivalNave.vidaMax}
                            </span>
                        </div>
                    </div>
                </div>
                
                <canvas id="spaceCanvasMulti" width="${game.W}" height="${game.H}"></canvas>
                
                <div class="dogfight-controls">
                    <div class="control-row">
                        <button class="ctrl-btn" 
                            onmousedown="cw.spaceMultiControl('left', true)" 
                            onmouseup="cw.spaceMultiControl('left', false)"
                            ontouchstart="cw.spaceMultiControl('left', true)" 
                            ontouchend="cw.spaceMultiControl('left', false)">⬅️</button>
                        <button class="ctrl-btn up" 
                            onmousedown="cw.spaceMultiControl('up', true)" 
                            onmouseup="cw.spaceMultiControl('up', false)"
                            ontouchstart="cw.spaceMultiControl('up', true)" 
                            ontouchend="cw.spaceMultiControl('up', false)">⬆️</button>
                        <button class="ctrl-btn" 
                            onmousedown="cw.spaceMultiControl('right', true)" 
                            onmouseup="cw.spaceMultiControl('right', false)"
                            ontouchstart="cw.spaceMultiControl('right', true)" 
                            ontouchend="cw.spaceMultiControl('right', false)">➡️</button>
                    </div>
                    <div class="control-row">
                        <button class="ctrl-btn down" 
                            onmousedown="cw.spaceMultiControl('down', true)" 
                            onmouseup="cw.spaceMultiControl('down', false)"
                            ontouchstart="cw.spaceMultiControl('down', true)" 
                            ontouchend="cw.spaceMultiControl('down', false)">⬇️</button>
                        <button class="ctrl-btn fire" 
                            onmousedown="cw.spaceMultiControl('space', true)" 
                            onmouseup="cw.spaceMultiControl('space', false)"
                            ontouchstart="cw.spaceMultiControl('space', true)" 
                            ontouchend="cw.spaceMultiControl('space', false)">🔥 DISPARAR</button>
                    </div>
                    <p class="control-hint">⬅️⬆️➡️⬇️ Mover | ESPACIO Disparar | Derriba al rival</p>
                </div>
                
                <button class="space-exit-btn" onclick="cw.salirSpaceMulti()">✕</button>
            </div>
        `;
        
        $('body').append(html);
        
        game.canvas = document.getElementById('spaceCanvasMulti');
        game.ctx = game.canvas.getContext('2d');
    }
    
    // Control táctil Space Multi
    this.spaceMultiControl = function(key, pressed) {
        if (!this.spaceGameMulti) return;
        this.spaceGameMulti.keys[key] = pressed;
    }
    
    // Controles teclado Space Multi (Dogfight)
    this.iniciarControlesSpaceMulti = function() {
        $(document).on('keydown.spacemulti', (e) => {
            const game = this.spaceGameMulti;
            if (!game || !game.activo) return;
            
            if (e.key === 'ArrowLeft' || e.key === 'a') game.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') game.keys.right = true;
            if (e.key === 'ArrowUp' || e.key === 'w') game.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's') game.keys.down = true;
            if (e.key === ' ') { e.preventDefault(); game.keys.space = true; }
            if (e.key === 'Escape') this.salirSpaceMulti();
        });
        
        $(document).on('keyup.spacemulti', (e) => {
            const game = this.spaceGameMulti;
            if (!game) return;
            
            if (e.key === 'ArrowLeft' || e.key === 'a') game.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') game.keys.right = false;
            if (e.key === 'ArrowUp' || e.key === 'w') game.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's') game.keys.down = false;
            if (e.key === ' ') game.keys.space = false;
        });
    }
    
    // Game loop Space Multi
    this.gameLoopSpaceMulti = function() {
        const game = this.spaceGameMulti;
        if (!game || !game.activo) return;
        
        try {
            this.actualizarDogfight();
            this.renderizarDogfight();
        } catch (error) {
            console.error("❌ Error en gameLoopSpaceMulti:", error);
        }
        
        game.animationFrame = requestAnimationFrame(() => this.gameLoopSpaceMulti());
    }
    
    // Actualizar Dogfight 1v1
    this.actualizarDogfight = function() {
        const game = this.spaceGameMulti;
        const ahora = Date.now();
        
        // ⏱️ VERIFICAR TIEMPO LÍMITE
        const tiempoTranscurrido = ahora - game.tiempoInicio;
        const tiempoRestante = Math.max(0, game.tiempoLimite - tiempoTranscurrido);
        
        // Actualizar UI del tiempo
        const minutos = Math.floor(tiempoRestante / 60000);
        const segundos = Math.floor((tiempoRestante % 60000) / 1000);
        $('#dogfightTimer').text(`${minutos}:${segundos.toString().padStart(2, '0')}`);
        
        // Si se acabó el tiempo - gana quien tenga más vida
        if (tiempoRestante <= 0) {
            const miVida = game.miNave.vida;
            const rivalVida = game.rivalNave.vida;
            
            if (miVida === rivalVida) {
                this.finSpaceMulti('empate');
            } else {
                this.finSpaceMulti(miVida > rivalVida);
            }
            return;
        }
        
        // Mover estrellas (fondo)
        game.estrellas.forEach(e => {
            e.y += e.velocidad;
            if (e.y > game.H) { e.y = 0; e.x = Math.random() * game.W; }
        });
        
        // Decrementar invulnerabilidad
        if (game.miNave.invulnerable > 0) game.miNave.invulnerable--;
        if (game.rivalNave.invulnerable > 0) game.rivalNave.invulnerable--;
        
        // === MOVER MI NAVE ===
        const nave = game.miNave;
        const margenY = game.esHost ? game.H / 2 : 0; // Límite de movimiento vertical
        const margenYMax = game.esHost ? game.H - 30 : game.H / 2;
        
        if (game.keys.left) nave.x = Math.max(30, nave.x - nave.velocidad);
        if (game.keys.right) nave.x = Math.min(game.W - 30, nave.x + nave.velocidad);
        if (game.keys.up) nave.y = Math.max(margenY + 30, nave.y - nave.velocidad * 0.7);
        if (game.keys.down) nave.y = Math.min(margenYMax - 30, nave.y + nave.velocidad * 0.7);
        
        // Enviar posición al rival
        if (ws) {
            ws.enviarPosicionNave(nave.x, nave.y, game.keys.space);
        }
        
        // === DISPARAR ===
        if (game.keys.space && ahora - game.ultimoDisparo > nave.cadencia) {
            game.ultimoDisparo = ahora;
            game.misProyectiles.push({
                x: nave.x,
                y: nave.y + (nave.direccionDisparo * 20),
                vy: nave.direccionDisparo * 12, // Velocidad del proyectil
                daño: nave.daño
            });
        }
        
        // === GENERAR POWERUPS ===
        if (game.esHost && ahora - game.ultimoPowerup > 8000) {
            game.ultimoPowerup = ahora;
            const tipos = ['vida', 'velocidad', 'daño', 'escudo'];
            const tipo = tipos[Math.floor(Math.random() * tipos.length)];
            const powerup = {
                id: `pw_${ahora}`,
                x: 50 + Math.random() * (game.W - 100),
                y: -30,
                tipo: tipo,
                emoji: tipo === 'vida' ? '❤️' : tipo === 'velocidad' ? '⚡' : tipo === 'daño' ? '💪' : '🛡️'
            };
            game.powerups.push(powerup);
            
            // Sincronizar con rival
            if (ws) {
                ws.enviarPowerup(powerup);
            }
        }
        
        // Mover powerups
        game.powerups.forEach(p => { p.y += 2; });
        game.powerups = game.powerups.filter(p => p.y < game.H + 50);
        
        // Colisión powerups con mi nave
        game.powerups = game.powerups.filter(p => {
            if (Math.abs(p.x - nave.x) < 30 && Math.abs(p.y - nave.y) < 30) {
                this.aplicarPowerup(p.tipo, 'jugador');
                return false;
            }
            return true;
        });
        
        // === MOVER PROYECTILES ===
        game.misProyectiles.forEach(p => { p.y += p.vy; });
        game.misProyectiles = game.misProyectiles.filter(p => p.y > 0 && p.y < game.H);
        
        game.proyectilesRival.forEach(p => { p.y += p.vy; });
        game.proyectilesRival = game.proyectilesRival.filter(p => p.y > 0 && p.y < game.H);
        
        // === COLISIONES: Mis proyectiles vs Rival ===
        game.misProyectiles = game.misProyectiles.filter(p => {
            const rival = game.rivalNave;
            if (rival.invulnerable <= 0 && Math.abs(p.x - rival.x) < 30 && Math.abs(p.y - rival.y) < 25) {
                // Impacto en rival - esto lo manejará el rival localmente
                // Nosotros mostramos la explosión
                game.explosiones.push({ x: rival.x, y: rival.y, radio: 25, progreso: 0 });
                
                // Notificar al servidor del impacto
                if (ws) {
                    ws.enviarImpactoAereo(p.daño);
                }
                return false;
            }
            return true;
        });
        
        // === COLISIONES: Proyectiles rival vs Mi nave ===
        game.proyectilesRival = game.proyectilesRival.filter(p => {
            if (nave.invulnerable <= 0 && Math.abs(p.x - nave.x) < 30 && Math.abs(p.y - nave.y) < 25) {
                // Me impactaron
                nave.vida -= (p.daño || 1);
                nave.invulnerable = 60; // ~1 segundo de invulnerabilidad
                game.explosiones.push({ x: nave.x, y: nave.y, radio: 25, progreso: 0 });
                this.actualizarUIVidaDogfight();
                
                if (nave.vida <= 0) {
                    this.finSpaceMulti(false);
                }
                return false;
            }
            return true;
        });
        
        // Actualizar explosiones
        game.explosiones = game.explosiones.filter(e => {
            e.progreso += 0.08;
            return e.progreso < 1;
        });
        
        // Actualizar partículas
        game.particulas = game.particulas.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vida -= 0.02;
            return p.vida > 0;
        });
    }
    
    // Aplicar powerup
    this.aplicarPowerup = function(tipo, quien) {
        const game = this.spaceGameMulti;
        const nave = quien === 'jugador' ? game.miNave : game.rivalNave;
        
        switch(tipo) {
            case 'vida':
                nave.vida = Math.min(nave.vida + 1, nave.vidaMax + 2);
                break;
            case 'velocidad':
                nave.velocidad += 2;
                setTimeout(() => { nave.velocidad -= 2; }, 10000);
                break;
            case 'daño':
                nave.daño++;
                setTimeout(() => { nave.daño--; }, 10000);
                break;
            case 'escudo':
                nave.invulnerable = 180; // ~3 segundos
                break;
        }
        
        this.actualizarUIVidaDogfight();
    }
    
    // Actualizar UI de vida
    this.actualizarUIVidaDogfight = function() {
        const game = this.spaceGameMulti;
        
        const miPct = Math.max(0, (game.miNave.vida / game.miNave.vidaMax) * 100);
        const rivalPct = Math.max(0, (game.rivalNave.vida / game.rivalNave.vidaMax) * 100);
        
        $('#miVida').css('width', miPct + '%');
        $('#miVidaText').text(`${Math.max(0, game.miNave.vida)}/${game.miNave.vidaMax}`);
        
        $('#rivalVida').css('width', rivalPct + '%');
        $('#rivalVidaText').text(`${Math.max(0, game.rivalNave.vida)}/${game.rivalNave.vidaMax}`);
    }
    
    // Renderizar Dogfight
    this.renderizarDogfight = function() {
        const game = this.spaceGameMulti;
        const ctx = game.ctx;
        const W = game.W;
        const H = game.H;
        
        // Fondo espacial
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0a0a2e');
        grad.addColorStop(0.5, '#1a1a4e');
        grad.addColorStop(1, '#0a0a2e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        
        // Línea divisoria (centro del campo)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Estrellas
        game.estrellas.forEach(e => {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + e.brillo * 0.7})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.tamaño, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Powerups
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        game.powerups.forEach(p => {
            ctx.fillText(p.emoji, p.x, p.y);
        });
        
        // Proyectiles propios (verde)
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8;
        game.misProyectiles.forEach(p => {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Proyectiles rival (rojo)
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        game.proyectilesRival.forEach(p => {
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, 4, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.shadowBlur = 0;
        
        // Nave rival
        ctx.font = '45px Arial';
        ctx.globalAlpha = game.rivalNave.invulnerable > 0 ? 0.5 : 0.9;
        ctx.fillText(game.rivalNave.emoji, game.rivalNave.x, game.rivalNave.y);
        
        // Mi nave
        ctx.globalAlpha = game.miNave.invulnerable > 0 ? 
            (Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.3) : 1;
        ctx.fillText(game.miNave.emoji, game.miNave.x, game.miNave.y);
        ctx.globalAlpha = 1;
        
        // Indicador de escudo si está activo
        if (game.miNave.invulnerable > 60) {
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(game.miNave.x, game.miNave.y, 35, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Explosiones
        game.explosiones.forEach(e => {
            const alpha = 1 - e.progreso;
            const radio = e.radio * (0.5 + e.progreso);
            
            ctx.fillStyle = `rgba(255, 150, 0, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, radio, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(e.x, e.y, radio * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Partículas
        game.particulas.forEach(p => {
            ctx.globalAlpha = p.vida;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radio, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
    
    // Recibir posición nave rival (Dogfight)
    this.onRivalNavePos = function(datos) {
        if (!this.spaceGameMulti) return;
        
        const game = this.spaceGameMulti;
        game.rivalNave.x = datos.x;
        game.rivalNave.y = datos.y;
        
        if (datos.disparando) {
            game.proyectilesRival.push({
                x: datos.x,
                y: game.rivalNave.y + (game.rivalNave.direccionDisparo * 20),
                vy: game.rivalNave.direccionDisparo * 12,
                daño: 1
            });
        }
    }
    
    // Recibir impacto (nos dispararon)
    this.onRecibirImpactoAereo = function(datos) {
        if (!this.spaceGameMulti) return;
        
        const game = this.spaceGameMulti;
        const nave = game.miNave;
        
        if (nave.invulnerable <= 0) {
            nave.vida -= (datos.daño || 1);
            nave.invulnerable = 60;
            game.explosiones.push({ x: nave.x, y: nave.y, radio: 25, progreso: 0 });
            this.actualizarUIVidaDogfight();
            
            if (nave.vida <= 0) {
                this.finSpaceMulti(false);
            }
        }
    }
    
    // Recibir powerup sincronizado
    this.onRecibirPowerup = function(datos) {
        if (!this.spaceGameMulti || this.spaceGameMulti.esHost) return;
        
        this.spaceGameMulti.powerups.push(datos.powerup);
    }
    
    // Recibir enemigo eliminado por rival (modo cooperativo legacy)
    this.onEnemigoEliminado = function(datos) {
        if (!this.spaceGameMulti) return;
        
        const game = this.spaceGameMulti;
        if (!game.enemigos) return; // No aplica en dogfight
        
        const idx = game.enemigos.findIndex(e => e.id === datos.enemigoId);
        
        if (idx !== -1) {
            game.explosiones.push({ x: game.enemigos[idx].x, y: game.enemigos[idx].y, radio: 30, progreso: 0 });
            game.enemigos.splice(idx, 1);
        }
    }
    
    // Recibir oleada sincronizada (modo cooperativo legacy)
    this.onSincronizarOleada = function(datos) {
        if (!this.spaceGameMulti || this.spaceGameMulti.esHost) return;
        if (!this.spaceGameMulti.enemigos) return; // No aplica en dogfight
        
        const game = this.spaceGameMulti;
        game.oleada = datos.oleada;
        $('#spaceOleada').text(game.oleada);
        
        // Añadir enemigos recibidos
        datos.enemigos.forEach(e => {
            game.enemigos.push(e);
        });
    }
    
    // Fin de Space Multi
    this.finSpaceMulti = function(resultadoParam) {
        const game = this.spaceGameMulti;
        if (!game) return;
        
        game.activo = false;
        cancelAnimationFrame(game.animationFrame);
        $(document).off('.spacemulti');
        
        // Determinar resultado
        let esEmpate = resultadoParam === 'empate';
        let victoria = resultadoParam === true;
        
        let resultado, color;
        if (esEmpate) {
            resultado = '🤝 ¡EMPATE!';
            color = '#FFC107';
        } else if (victoria) {
            resultado = '🏆 ¡VICTORIA!';
            color = '#4CAF50';
        } else {
            resultado = '💀 DERROTA';
            color = '#f44336';
        }
        
        // Notificar al servidor
        if (ws) {
            ws.finalizarPartida(
                victoria ? $.cookie('nick') : (esEmpate ? null : game.rivalEmail),
                victoria ? game.rivalEmail : (esEmpate ? null : $.cookie('nick')),
                esEmpate,
                { puntosJugador: game.miNave.puntos, puntosRival: game.rivalNave.puntos }
            );
        }
        
        // Mostrar resultado
        const overlay = `
            <div class="space-result-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                 background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; color: white;">
                    <h1 style="font-size: 3rem; color: ${color};">${resultado}</h1>
                    <p style="font-size: 1.5rem;">Tu puntuación: ${game.miNave.puntos}</p>
                    <p style="font-size: 1.2rem;">Rival: ${game.rivalNave.puntos}</p>
                    <p style="font-size: 1rem; color: #888; margin-top: 10px;">
                        ${esEmpate ? '+10 copas (empate)' : (victoria ? '+22 copas' : '+0 copas')}
                    </p>
                    <button onclick="$('.space-result-overlay').remove(); cw.salirSpaceMulti();" 
                            style="margin-top: 20px; padding: 15px 40px; font-size: 1.2rem; cursor: pointer;">
                        Continuar
                    </button>
                </div>
            </div>
        `;
        $('body').append(overlay);
    }
    
    // Salir de Space Multi
    this.salirSpaceMulti = function() {
        if (this.spaceGameMulti) {
            this.spaceGameMulti.activo = false;
            cancelAnimationFrame(this.spaceGameMulti.animationFrame);
        }
        
        $(document).off('.spacemulti');
        $('#spaceInvadersMulti').remove();
        $('.space-result-overlay').remove();
        this.spaceGameMulti = null;
        
        this.mostrarMenuPrincipal();
    }
    
    // Iniciar Batalla Naval Multijugador (usa la misma interfaz que IA)
    this.iniciarBatallaNavalMulti = function(datos) {
        console.log("⚓ Iniciando Batalla Naval Multi:", datos);
        
        // Ocultar UI principal
        $('.game-container').hide();
        $('#googleSigninContainer').hide();
        $('#rankingPanel').hide();
        $('#profileIcon').hide();
        
        const miEmail = $.cookie('nick');
        // Determinar rival (el otro jugador que no soy yo)
        const rivalEmail = datos.jugadores ? datos.jugadores.find(j => j !== miEmail) : (datos.rival || 'Rival');
        
        const GRID_SIZE = 12; // Tablero 12x12 para 7 barcos
        const mapa = datos.mapa ? this.mapasShooter?.mar?.find(m => m.id === datos.mapa) : { nombre: 'Océano', emoji: '🌊', rareza: 'Común' };
        
        // Usar la misma configuración de barcos que IA - 7 barcos de 1 a 7 casillas
        const barcosConfig = [
            { nombre: 'Lancha', tamaño: 1, emoji: '🚤', rareza: 'Común', vidaPorTrozo: 1,
              superpoder: { nombre: '🎯 Disparo Preciso', descripcion: 'Ataca 1 casilla garantizado', tipo: 'area', area: 1, daño: 1 } },
            { nombre: 'Patrullero', tamaño: 2, emoji: '🛥️', rareza: 'Común', vidaPorTrozo: 1,
              superpoder: { nombre: '💣 Disparo Doble', descripcion: 'Ataca 2 casillas en línea', tipo: 'linea', area: 2, daño: 1 } },
            { nombre: 'Destructor', tamaño: 3, emoji: '🚢', rareza: 'Raro', vidaPorTrozo: 2,
              superpoder: { nombre: '🌊 Torpedo Triple', descripcion: 'Ataca 3 casillas en línea', tipo: 'linea', area: 3, daño: 1 } },
            { nombre: 'Crucero', tamaño: 4, emoji: '⛴️', rareza: 'Épico', vidaPorTrozo: 2,
              superpoder: { nombre: '🎯 Bombardeo Cuadrado', descripcion: 'Ataca área de 2x2', tipo: 'area', area: 2, daño: 1 } },
            { nombre: 'Acorazado', tamaño: 5, emoji: '🛳️', rareza: 'Épico', vidaPorTrozo: 3,
              superpoder: { nombre: '☄️ Misil Crucero', descripcion: 'Ataca área de 3x3', tipo: 'area', area: 3, daño: 1 } },
            { nombre: 'Portaaviones', tamaño: 6, emoji: '🚀', rareza: 'Mítico', vidaPorTrozo: 3,
              superpoder: { nombre: '✈️ Ataque Aéreo', descripcion: 'Ataca área de 4x4', tipo: 'area', area: 4, daño: 1 } },
            { nombre: 'Dreadnought', tamaño: 7, emoji: '⚓', rareza: 'Legendario', vidaPorTrozo: 4,
              superpoder: { nombre: '💀 Aniquilación', descripcion: 'Ataca área de 5x5', tipo: 'area', area: 5, daño: 2 } }
        ];
        
        this.navalGameMulti = {
            activo: true,
            esMultijugador: true,
            roomId: datos.roomId,
            turno: datos.turnoInicial === $.cookie('nick') ? 'jugador' : 'enemigo',
            fase: 'colocacion',
            gridSize: GRID_SIZE,
            mapa: mapa,
            barcosConfig: barcosConfig,
            barcoActual: 0,
            orientacion: 'horizontal', // Cambiado para coincidir con IA
            
            energiaJugador: 0,
            energiaMaxima: 7,
            energiaEnemigo: 0,
            superpoderActivo: null,
            hechizosJugador: [],
            hechizoActivo: null,
            
            jugador: {
                tablero: this.crearTableroVacio(GRID_SIZE),
                disparos: this.crearTableroVacio(GRID_SIZE),
                barcos: [],
                email: $.cookie('nick')
            },
            
            enemigo: {
                tablero: this.crearTableroVacio(GRID_SIZE),
                disparos: this.crearTableroVacio(GRID_SIZE),
                barcos: [],
                email: rivalEmail
            }
        };
        
        // Usar referencia común para funciones compartidas
        this.navalGame = this.navalGameMulti;
        
        this.mostrarColocacionFlotaMulti();
    }
    
    // Mostrar colocación de flota estilo IA
    this.mostrarColocacionFlotaMulti = function() {
        const game = this.navalGameMulti;
        const mapa = game.mapa;
        
        const html = `
            <div class="naval-container">
                <div class="naval-header">
                    <div class="naval-title-row">
                        <h2>🚢 BATALLA NAVAL - Multijugador</h2>
                        <span class="efecto-mapa-badge" title="${mapa.efecto || 'Sin efecto especial'}">
                            ${mapa.emoji} ${mapa.nombre}
                        </span>
                        <button class="naval-exit-btn" onclick="cw.salirBatallaNavalMulti()">❌ Salir</button>
                    </div>
                </div>
                
                <div class="naval-content">
                    <div class="naval-board-section jugador">
                        <h3>🎯 Tu Tablero</h3>
                        <div class="naval-board" id="tableroJugador">
                            ${this.renderizarTableroNaval('jugador', true)}
                        </div>
                    </div>
                    
                    <div class="naval-colocacion-info">
                        <div id="colocacionPanel" class="colocacion-panel-multi">
                            <h4>📍 Coloca tus barcos</h4>
                            <div id="barcoActualInfo"></div>
                            <button class="btn-rotar-compact" onclick="cw.rotarBarcoNaval()">🔄 Rotar (R)</button>
                            <div class="barcos-pendientes" id="barcosPendientes"></div>
                        </div>
                    </div>
                </div>
                
                <div class="naval-footer">
                    <div style="text-align: center; padding: 15px;">
                        <button class="btn-iniciar-combate mar" id="btnFlotaLista" disabled>
                            ⚓ ¡Flota Lista! - Esperando rival...
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.limpiar();
        $("#au").html(html);
        
        // Actualizar UI de colocación
        this.actualizarInfoColocacionMulti();
        
        // Eventos
        $("#btnFlotaLista").on("click", () => {
            if (game.jugador.barcos.length === game.barcosConfig.length) {
                this.enviarFlotaMulti();
            }
        });
        
        $(document).on('keydown.naval', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                this.rotarBarcoNaval();
            }
        });
    }
    
    // Actualizar info de colocación multi
    this.actualizarInfoColocacionMulti = function() {
        const game = this.navalGameMulti;
        if (!game || game.fase !== 'colocacion') return;
        
        const config = game.barcosConfig[game.barcoActual];
        if (config) {
            $('#barcoActualInfo').html(`
                <p class="barco-actual">${config.emoji} ${config.nombre}</p>
                <p class="barco-size">${config.tamaño} casillas · Orientación: ${game.orientacion === 'horizontal' ? 'Horizontal' : 'Vertical'}</p>
            `);
        }
        
        // Mostrar barcos pendientes
        let pendientesHtml = '<p><strong>Barcos:</strong></p>';
        game.barcosConfig.forEach((b, idx) => {
            const estado = idx < game.barcoActual ? 'colocado' : (idx === game.barcoActual ? 'actual' : '');
            pendientesHtml += `<div class="barco-pendiente ${estado}">${b.emoji} ${b.nombre} (${b.tamaño})</div>`;
        });
        $('#barcosPendientes').html(pendientesHtml);
        
        // Habilitar botón si todos colocados
        if (game.jugador.barcos.length === game.barcosConfig.length) {
            $('#btnFlotaLista').prop('disabled', false).text('⚓ ¡Flota Lista!');
        }
    }
    
    // Enviar flota al servidor
    this.enviarFlotaMulti = function() {
        const game = this.navalGameMulti;
        
        // Preparar datos de la flota para enviar
        const flotaData = {
            tablero: game.jugador.tablero,
            barcos: game.jugador.barcos.map(b => ({
                nombre: b.nombre,
                casillas: b.casillas,
                vidaActual: b.vidaActual
            }))
        };
        
        if (ws) {
            ws.enviarFlota(flotaData);
            $('#btnFlotaLista').prop('disabled', true).text('⏳ Esperando rival...');
            this.mostrarMensajeNaval('✅ ¡Flota enviada! Esperando al rival...', 3000);
        }
    }
    
    // Handler cuando el rival está listo
    this.onRivalFlotaLista = function(datos) {
        this.mostrarMensajeNaval('⚓ ¡El rival ha colocado su flota!', 2000);
    }
    
    // Handler para iniciar combate naval
    this.onIniciarCombateNaval = function(datos) {
        const miEmail = $.cookie('nick');
        const game = this.navalGameMulti;
        
        game.fase = 'batalla';
        game.turno = datos.turnoInicial === miEmail ? 'jugador' : 'enemigo';
        
        this.mostrarBatallaNavalMulti();
    }
    
    // Mostrar batalla naval multijugador
    this.mostrarBatallaNavalMulti = function() {
        const game = this.navalGameMulti;
        this.navalGame = game; // Usar referencia común
        
        const mapa = game.mapa;
        const esMiTurno = game.turno === 'jugador';
        
        const html = `
            <div class="naval-container">
                <div class="naval-header">
                    <div class="naval-title-row">
                        <h2>⚔️ BATALLA NAVAL - vs ${game.enemigo.email?.split('@')[0] || 'Rival'}</h2>
                        <span id="navalTurno" class="naval-turno-badge">
                            ${esMiTurno ? '🎯 ¡Tu turno!' : '⏳ Turno del rival...'}
                        </span>
                        <span class="efecto-mapa-badge">${mapa.emoji} ${mapa.nombre}</span>
                        <button class="naval-exit-btn" onclick="cw.salirBatallaNavalMulti()">❌ Salir</button>
                    </div>
                    
                    <div class="naval-energia-row">
                        <span class="energia-label">⚡ Energía:</span>
                        <div class="energia-bar">
                            <div class="energia-fill" id="energiaFill" style="width: 0%;"></div>
                        </div>
                        <span class="energia-text" id="energiaText">0/${game.energiaMaxima}</span>
                    </div>
                </div>
                
                <div class="naval-content">
                    <div class="naval-board-section jugador">
                        <h3>🛡️ Tu Flota</h3>
                        <div class="naval-board" id="tableroJugador">
                            ${this.renderizarTableroNaval('jugador', true)}
                        </div>
                        <div class="barcos-status" id="barcosJugadorStatus"></div>
                    </div>
                    
                    <div class="naval-board-section enemigo">
                        <h3>🎯 Tablero Enemigo</h3>
                        <div class="naval-board enemy ${esMiTurno ? '' : 'disabled'}" id="tableroEnemigo">
                            ${this.renderizarTableroNavalMulti('enemigo')}
                        </div>
                        <div class="barcos-status" id="barcosEnemigoStatus"></div>
                    </div>
                </div>
                
                <div class="naval-footer">
                    <div class="naval-poderes-panel">
                        <div class="superpoderes-section">
                            <span class="section-label">⚡ Superpoderes:</span>
                            <div class="superpoder-btns" id="superpoderBtns"></div>
                        </div>
                        <div class="hechizos-section">
                            <span class="section-label">✨ Hechizos:</span>
                            <div class="hechizos-btns" id="hechizosBtns"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.limpiar();
        $("#au").html(html);
        
        this.actualizarTablerosNaval();
        this.actualizarStatusBarcos();
        this.actualizarBarraEnergia();
        this.generarBotonesSuperpoder();
        this.actualizarHechizosUI();
    }
    
    // Renderizar tablero para multijugador (enemigo)
    this.renderizarTableroNavalMulti = function(quien) {
        const game = this.navalGameMulti;
        if (!game) return '';
        
        let html = '';
        for (let y = 0; y < game.gridSize; y++) {
            for (let x = 0; x < game.gridSize; x++) {
                let clase = 'naval-cell';
                let contenido = '';
                let estiloExtra = '';
                
                const miDisparo = game.jugador.disparos[y][x];
                if (miDisparo === 1) {
                    // Ya disparamos aquí
                    const resultado = game.resultadosDisparos?.[`${x},${y}`];
                    if (resultado?.impacto) {
                        clase += ' tocado';
                        contenido = resultado.hundido ? '☠️' : '🔥';
                    } else {
                        clase += ' agua disparada';
                        contenido = '💦';
                    }
                }
                
                const onclick = game.turno === 'jugador' && miDisparo !== 1
                    ? `onclick="cw.dispararNavalMulti(${x}, ${y})"`
                    : '';
                
                const style = estiloExtra ? `style="${estiloExtra}"` : '';
                html += `<div class="${clase}" data-x="${x}" data-y="${y}" ${style} ${onclick}>${contenido}</div>`;
            }
        }
        
        return html;
    }
    
    // Disparar en multijugador
    this.dispararNavalMulti = function(x, y) {
        const game = this.navalGameMulti;
        if (!game || game.turno !== 'jugador') return;
        if (game.jugador.disparos[y][x] === 1) return;
        
        // Marcar como disparado
        game.jugador.disparos[y][x] = 1;
        
        // Animación de disparo
        this.animarDisparo(x, y, 'missile');
        
        // Enviar al servidor
        if (ws) {
            ws.enviarDisparoNaval(x, y);
        }
        
        // Deshabilitar tablero mientras esperamos respuesta
        game.turno = 'esperando';
        $('#tableroEnemigo').addClass('disabled');
        $('#navalTurno').text('⏳ Esperando respuesta...');
    }
    
    // Handler resultado naval desde servidor
    this.onResultadoNavalMulti = function(datos) {
        const { x, y, impacto, hundido, barcoHundido, siguienteTurno, victoria, derrota } = datos;
        const game = this.navalGameMulti;
        const miEmail = $.cookie('nick');
        
        // Guardar resultado
        if (!game.resultadosDisparos) game.resultadosDisparos = {};
        game.resultadosDisparos[`${x},${y}`] = { impacto, hundido };
        
        // Animación
        if (impacto) {
            if (hundido) {
                this.animarDisparo(x, y, 'sink');
                this.mostrarMensajeNaval(`🚢💥 ¡${barcoHundido || 'Barco'} hundido!`, 2500);
            } else {
                this.animarDisparo(x, y, 'hit');
            }
            game.energiaJugador = Math.min(game.energiaJugador + 1, game.energiaMaxima);
            this.actualizarBarraEnergia();
        } else {
            this.animarDisparo(x, y, 'water');
        }
        
        // Verificar fin de partida
        if (victoria) {
            setTimeout(() => this.finalizarBatallaNavalMulti(true), 1500);
            return;
        }
        
        // Actualizar turno
        game.turno = siguienteTurno === miEmail ? 'jugador' : 'enemigo';
        
        setTimeout(() => {
            this.actualizarTablerosNavalMulti();
            if (game.turno === 'jugador') {
                $('#navalTurno').text('🎯 ¡Tu turno!');
                $('#tableroEnemigo').removeClass('disabled');
            } else {
                $('#navalTurno').text('⏳ Turno del rival...');
                $('#tableroEnemigo').addClass('disabled');
            }
        }, 1000);
    }
    
    // Handler disparo del rival
    this.onRecibirDisparoNaval = function(datos) {
        const { x, y, atacante } = datos;
        const game = this.navalGameMulti;
        
        // Verificar impacto en nuestro tablero
        const hayBarco = game.jugador.tablero[y][x] === 1;
        let hundido = false;
        let barcoHundido = null;
        
        if (hayBarco) {
            const barco = this.getBarcoEnPosicion(game.jugador.barcos, x, y);
            if (barco) {
                const casilla = barco.casillas.find(c => c.x === x && c.y === y);
                if (casilla && casilla.vida > 0) {
                    casilla.vida--;
                    casilla.tocado = true;
                    barco.vidaActual--;
                    
                    if (barco.casillas.every(c => c.vida <= 0)) {
                        barco.hundido = true;
                        hundido = true;
                        barcoHundido = barco.nombre;
                    }
                }
            }
            
            // Animación
            if (hundido) {
                this.animarDisparoEnemigo(x, y, 'sink');
                this.mostrarMensajeNaval(`💀 ¡Hundieron tu ${barcoHundido}!`, 2500);
            } else {
                this.animarDisparoEnemigo(x, y, 'hit');
            }
        } else {
            this.animarDisparoEnemigo(x, y, 'water');
        }
        
        // Marcar disparo enemigo
        game.enemigo.disparos[y][x] = 1;
        
        // Verificar derrota
        const derrota = game.jugador.barcos.every(b => b.hundido);
        
        // Enviar resultado
        if (ws) {
            ws.enviarResultadoNaval(x, y, hayBarco, hundido, barcoHundido, derrota);
        }
        
        if (derrota) {
            setTimeout(() => this.finalizarBatallaNavalMulti(false), 1500);
        }
        
        // Actualizar tableros
        setTimeout(() => this.actualizarTablerosNavalMulti(), 500);
    }
    
    // Actualizar tableros multijugador
    this.actualizarTablerosNavalMulti = function() {
        const game = this.navalGameMulti;
        if (!game) return;
        
        this.navalGame = game; // Referencia común
        $('#tableroJugador').html(this.renderizarTableroNaval('jugador', true));
        $('#tableroEnemigo').html(this.renderizarTableroNavalMulti('enemigo'));
        this.actualizarStatusBarcos();
    }
    
    // Finalizar batalla naval multi
    this.finalizarBatallaNavalMulti = function(victoria) {
        const game = this.navalGameMulti;
        game.activo = false;
        
        // Usar la misma función de finalización que IA
        this.navalGame = game;
        this.finalizarBatallaNaval(victoria);
    }
    
    // Salir de batalla naval multi
    this.salirBatallaNavalMulti = function() {
        if (confirm('¿Seguro que quieres abandonar la partida? Contará como derrota.')) {
            $(document).off('keydown.naval');
            this.navalGameMulti = null;
            this.navalGame = null;
            
            if (ws) {
                ws.abandonarPartida();
            }
            
            this.salirBatallaNaval();
        }
    }
    
    // Handler jugador desconectado
    this.onJugadorDesconectado = function(datos) {
        this.mostrarMensaje(`❌ ${datos.email} se ha desconectado`);
    }
    
    // Handler victoria por abandono
    this.onVictoriaAbandonoRival = function(datos) {
        this.mostrarModal(`
            <div style="text-align: center;">
                <h2 style="color: #28a745;">🏆 ¡VICTORIA!</h2>
                <p>${datos.razon}</p>
                <button class="btn btn-primary mt-3" onclick="$('#miModal').modal('hide'); cw.mostrarMenuPrincipal();">
                    Continuar
                </button>
            </div>
        `);
    }
    
    // ==========================================
    // MOSTRAR RESULTADOS DE PARTIDA
    // ==========================================
    
    this.mostrarResultadosPartida = function(datos) {
        console.log("🏆 Mostrando resultados:", datos);
        
        const miEmail = $.cookie('nick');
        let miResultado, recompensas;
        
        if (datos.esEmpate) {
            miResultado = 'empate';
            recompensas = datos.ganador; // En empate ambos tienen las mismas
        } else if (datos.ganador && datos.ganador.email === miEmail) {
            miResultado = 'victoria';
            recompensas = datos.ganador;
        } else {
            miResultado = 'derrota';
            recompensas = datos.perdedor;
        }
        
        const colores = {
            victoria: '#4CAF50',
            empate: '#FF9800',
            derrota: '#f44336'
        };
        
        const titulos = {
            victoria: '🏆 ¡VICTORIA!',
            empate: '🤝 EMPATE',
            derrota: '💀 DERROTA'
        };
        
        // Animación de resultados
        const html = `
            <div class="resultado-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                 background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div class="resultado-card" style="text-align: center; padding: 40px; background: linear-gradient(135deg, #1a1a2e, #16213e); 
                     border-radius: 20px; max-width: 400px; animation: fadeInUp 0.5s;">
                    
                    <h1 style="color: ${colores[miResultado]}; font-size: 2.5rem; margin-bottom: 20px;">
                        ${titulos[miResultado]}
                    </h1>
                    
                    <div class="recompensas-display" style="margin: 30px 0;">
                        <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 20px;">
                            <div class="reward-item" style="text-align: center;">
                                <div style="font-size: 2rem;">💰</div>
                                <div style="color: #FFD700; font-size: 1.5rem; font-weight: bold;">
                                    +${recompensas ? recompensas.oroGanado : 0}
                                </div>
                            </div>
                            <div class="reward-item" style="text-align: center;">
                                <div style="font-size: 2rem;">⭐</div>
                                <div style="color: #9C27B0; font-size: 1.5rem; font-weight: bold;">
                                    +${recompensas ? recompensas.xpGanado : 0} XP
                                </div>
                            </div>
                            <div class="reward-item" style="text-align: center;">
                                <div style="font-size: 2rem;">🏆</div>
                                <div style="color: ${miResultado === 'derrota' ? '#f44336' : '#4CAF50'}; font-size: 1.5rem; font-weight: bold;">
                                    ${miResultado === 'derrota' ? '' : '+'}${recompensas ? recompensas.copasGanadas : 0}
                                </div>
                            </div>
                        </div>
                        
                        ${recompensas && recompensas.subioNivel ? `
                            <div style="background: rgba(156,39,176,0.3); padding: 15px; border-radius: 10px; margin: 15px 0;">
                                <p style="color: #E1BEE7; margin: 0;">🎉 ¡Subiste al nivel ${recompensas.nuevoNivel}!</p>
                            </div>
                        ` : ''}
                        
                        ${recompensas && recompensas.cambioRango ? `
                            <div style="background: rgba(255,215,0,0.2); padding: 15px; border-radius: 10px; margin: 15px 0;">
                                <p style="color: #FFD700; margin: 0;">
                                    ${recompensas.rangoSubio ? '🎖️ ¡Ascendiste a ' : '📉 Bajaste a '}
                                    ${recompensas.nuevoRango}!
                                </p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <button onclick="$('.resultado-overlay').fadeOut(); cw.mostrarMenuPrincipal();" 
                            style="background: ${colores[miResultado]}; border: none; color: #fff; 
                                   padding: 15px 40px; border-radius: 10px; font-size: 1.2rem; cursor: pointer;">
                        Continuar
                    </button>
                </div>
            </div>
        `;
        
        $('body').append(html);
        
        // Actualizar datos locales
        if (recompensas) {
            this.datosJugador.monedas += recompensas.oroGanado || 0;
            this.datosJugador.experiencia += recompensas.xpGanado || 0;
            this.datosJugador.copas += recompensas.copasGanadas || 0;
            
            if (miResultado === 'victoria') {
                this.datosJugador.victorias = (this.datosJugador.victorias || 0) + 1;
            } else if (miResultado === 'derrota') {
                this.datosJugador.derrotas = (this.datosJugador.derrotas || 0) + 1;
            } else {
                this.datosJugador.empates = (this.datosJugador.empates || 0) + 1;
            }
            
            this.guardarProgreso();
            this.actualizarMonedas();
        }
    }
    
    // Legacy functions
    this.mostrarPanelUnJugador = function() { this.mostrarMenuPrincipal(); }
    this.mostrarPanelMultijugador = function() { this.mostrarMenuPrincipal(); }
    this.amigos = [];
    this.agregarAmigo = function(nick) { this.mostrarMensaje('Función en desarrollo'); }
    this.eliminarAmigo = function(nick) {}
    this.actualizarListaAmigos = function() {}

    window.ControlWeb = ControlWeb;
}
