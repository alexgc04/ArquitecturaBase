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
        this.removeDomainBackground();
        
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
        
        // Estadísticas de batalla
        const victorias = datos.victorias || 0;
        const derrotas = datos.derrotas || 0;
        const empates = datos.empates || 0;
        const totalPartidas = victorias + derrotas + empates;
        const winrate = totalPartidas > 0 ? Math.round((victorias / totalPartidas) * 100) : 0;
        
        $('#statVictorias').text(victorias);
        $('#statDerrotas').text(derrotas);
        $('#statEmpates').text(empates);
        $('#statWinrate').text(winrate + '%');
        
        // Copas/Trofeos
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
            // Mostrar desbloqueo de dominio si lo hay
            if (liga.desbloqueo) {
                const desbloqueado = copasActuales >= liga.puntos[0];
                html += `
                    <div class="ranking-unlock ${desbloqueado ? 'unlocked' : 'locked'}">
                        <span class="unlock-icon">${desbloqueado ? '🔓' : '🔒'}</span>
                        <span class="unlock-text">Desbloquea: ${liga.desbloqueo}</span>
                    </div>
                `;
            }
            
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
                            <div class="xp-bar-fill" style="width: ${(this.datosJugador.experiencia / 30) * 100}%"></div>
                        </div>
                        <span class="xp-text">${this.datosJugador.experiencia}/30 XP</span>
                    </div>
                </div>
                
                <p class="menu-instruction">🎯 Selecciona un dominio de combate:</p>
                
                <button class="menu-btn btn-singleplayer ${!tierraDesbloqueado ? 'domain-locked' : ''}" id="btnDominioTierraMenu">
                    🎖️ DOMINIO TERRESTRE
                    ${!tierraDesbloqueado ? '<span class="unlock-info">🔒 Rango: Recluta</span>' : '<span class="unlock-info">✅ DESBLOQUEADO</span>'}
                </button>
                <button class="menu-btn btn-multiplayer ${!marDesbloqueado ? 'domain-locked' : ''}" id="btnDominioMarMenu">
                    🚢 DOMINIO NAVAL
                    ${!marDesbloqueado ? '<span class="unlock-info">🔒 Rango: Cabo</span>' : '<span class="unlock-info">✅ DESBLOQUEADO</span>'}
                </button>
                <button class="menu-btn btn-config ${!aireDesbloqueado ? 'domain-locked' : ''}" id="btnDominioAireMenu">
                    ✈️ DOMINIO AÉREO
                    ${!aireDesbloqueado ? '<span class="unlock-info">🔒 Rango: Comandante</span>' : '<span class="unlock-info">✅ DESBLOQUEADO</span>'}
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

    // Sistema de Rangos con puntos
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
        ligas: ['I', 'II', 'III']
    };

    // Datos de unidades de ATAQUE con precios actualizados y Mítico
    // ESPACIO: Cuánto ocupa cada tropa (menor espacio = más tropas)
    // RANGO: Distancia de ataque de la tropa
    this.unidadesAtaque = {
        tierra: {
            nombre: "Terrestre",
            emoji: "🎖️",
            rangoRequerido: 0,
            // NUEVO SISTEMA SHOOTER 1v1
            tipoJuego: "shooter",
            tropas: [
                // ==========================================
                // SOLDADO (COMÚN) - Tropa inicial gratuita
                // ==========================================
                {
                    id: "soldado",
                    nombre: "Soldado",
                    emoji: "🪖",
                    rareza: "Común",
                    precio: 0,
                    precioDiamantes: 0,
                    desbloqueado: true,
                    // Estadísticas base del personaje
                    stats: {
                        vida: 100,
                        velocidad: 5,
                        salto: 12,
                        tamaño: { ancho: 40, alto: 60 }
                    },
                    // ARMAS del soldado (2 armas)
                    armas: [
                        {
                            id: "pistola",
                            nombre: "Pistola M9",
                            emoji: "🔫",
                            tipo: "pistola",
                            daño: 15,
                            cadencia: 400, // ms entre disparos
                            alcance: 350,
                            proyectilVelocidad: 15,
                            recarga: 1500,
                            cargador: 12,
                            // Ataque definitivo
                            definitiva: {
                                nombre: "Modo Ametralladora",
                                descripcion: "Dispara a velocidad extrema durante 10 segundos",
                                duracion: 10000,
                                tiempoCarga: 45000, // 45 segundos para cargar
                                efectos: {
                                    cadenciaMultiplicador: 0.15, // Dispara 6x más rápido
                                    dañoMultiplicador: 0.7 // Menos daño por bala
                                }
                            }
                        },
                        {
                            id: "escopeta",
                            nombre: "Escopeta Táctica",
                            emoji: "🔫",
                            tipo: "escopeta",
                            daño: 8, // por perdigón
                            perdigones: 6,
                            dispersion: 15, // grados de dispersión
                            cadencia: 1200,
                            alcance: 150,
                            proyectilVelocidad: 12,
                            recarga: 2000,
                            cargador: 6,
                            definitiva: {
                                nombre: "Super Escopetazo",
                                descripcion: "Dispara 10 perdigones de alto poder",
                                tiempoCarga: 40000,
                                efectos: {
                                    perdigones: 10,
                                    dañoMultiplicador: 2.5,
                                    dispersionReducida: 5
                                }
                            }
                        }
                    ],
                    descripcion: "Infantería básica de combate. Versátil y confiable."
                },
                
                // ==========================================
                // LANCERO (RARO)
                // ==========================================
                {
                    id: "lancero",
                    nombre: "Lancero",
                    emoji: "🏹",
                    rareza: "Raro",
                    precio: 500,
                    precioDiamantes: 0,
                    desbloqueado: false,
                    stats: {
                        vida: 85,
                        velocidad: 5.5,
                        salto: 14,
                        tamaño: { ancho: 38, alto: 58 }
                    },
                    armas: [
                        {
                            id: "arco",
                            nombre: "Arco Compuesto",
                            emoji: "🏹",
                            tipo: "arco",
                            daño: 25,
                            cadencia: 800,
                            alcance: 450,
                            proyectilVelocidad: 18,
                            cargaMaxima: 1500, // Tiempo para carga completa
                            dañoCargado: 45, // Daño con carga completa
                            definitiva: {
                                nombre: "Flecha de Fuego",
                                descripcion: "Flecha explosiva que causa quemaduras",
                                tiempoCarga: 50000,
                                efectos: {
                                    dañoBase: 60,
                                    quemadura: {
                                        daño: 5,
                                        duracion: 3500, // 3.5 segundos
                                        ticks: 7
                                    },
                                    explosion: 80 // radio de explosión
                                }
                            }
                        },
                        {
                            id: "francotirador",
                            nombre: "Rifle de Precisión",
                            emoji: "🎯",
                            tipo: "francotirador",
                            daño: 55,
                            cadencia: 1800,
                            alcance: 600,
                            proyectilVelocidad: 25,
                            recarga: 3000,
                            cargador: 5,
                            zoom: 2.5,
                            definitiva: {
                                nombre: "Disparo Penetrante",
                                descripcion: "Disparo devastador. Doble daño en cabeza.",
                                tiempoCarga: 55000,
                                efectos: {
                                    dañoBase: 90,
                                    multiplicadorCabeza: 2.0,
                                    atraviesa: true
                                }
                            }
                        }
                    ],
                    descripcion: "Especialista en combate a distancia. Letal y preciso."
                },
                
                // ==========================================
                // TANQUE LIGERO (ÉPICO)
                // ==========================================
                {
                    id: "tanque_ligero",
                    nombre: "Tanque Ligero",
                    emoji: "🛻",
                    rareza: "Épico",
                    precio: 2500,
                    precioDiamantes: 25,
                    desbloqueado: false,
                    stats: {
                        vida: 250,
                        velocidad: 3,
                        salto: 0, // No puede saltar
                        tamaño: { ancho: 80, alto: 50 }
                    },
                    armas: [
                        {
                            id: "canon_tanque",
                            nombre: "Cañón Principal",
                            emoji: "💥",
                            tipo: "cañon",
                            daño: 40,
                            cadencia: 1500,
                            alcance: 400,
                            proyectilVelocidad: 14,
                            recarga: 2500,
                            cargador: 8,
                            definitiva: {
                                nombre: "Disparo Explosivo",
                                descripcion: "Proyectil con explosión de área",
                                tiempoCarga: 40000,
                                efectos: {
                                    dañoBase: 70,
                                    radioExplosion: 120,
                                    dañoArea: 35
                                }
                            }
                        },
                        {
                            id: "lanzacohetes",
                            nombre: "Lanzacohetes Triple",
                            emoji: "🚀",
                            tipo: "cohetes",
                            daño: 30,
                            cohetesRafaga: 3,
                            intervaloRafaga: 200,
                            cadencia: 2500,
                            alcance: 350,
                            proyectilVelocidad: 10,
                            definitiva: {
                                nombre: "Bomba Atómica",
                                descripcion: "Devastación nuclear en área masiva",
                                tiempoCarga: 90000, // 90 segundos
                                efectos: {
                                    dañoBase: 150,
                                    radioExplosion: 250,
                                    dañoArea: 80,
                                    aturdimiento: 2000
                                }
                            }
                        },
                        {
                            id: "laser",
                            nombre: "Cañón Láser",
                            emoji: "⚡",
                            tipo: "laser",
                            daño: 8, // por tick
                            tickRate: 100, // cada 100ms
                            alcance: 300,
                            definitiva: {
                                nombre: "Mega Rayo de Plasma",
                                descripcion: "Rayo concentrado. Mantén para más daño.",
                                tiempoCarga: 60000,
                                efectos: {
                                    dañoBase: 15, // por tick
                                    duracionMaxima: 3000,
                                    multiplicadorTiempo: 1.5 // más tiempo = más daño
                                }
                            }
                        }
                    ],
                    descripcion: "Vehículo blindado con arsenal pesado."
                }
            ]
        },
        mar: {
            nombre: "Naval",
            emoji: "🚢",
            rangoRequerido: 2,
            capacidadMaxima: 25,
            unidades: [
                { id: "lancha", nombre: "Lancha Patrullera", emoji: "🚤", icono: "patrol-boat", precio: 0, precioDiamantes: 0, rareza: "Común", ataque: 18, vida: 25, velocidad: 5, espacio: 1, rango: 40, descripcion: "Embarcación de reconocimiento" },
                { id: "torpedero", nombre: "Torpedero", emoji: "💣", icono: "torpedo-boat", precio: 375, precioDiamantes: 0, rareza: "Común", ataque: 28, vida: 22, velocidad: 4, espacio: 2, rango: 80, descripcion: "Lanza torpedos letales" },
                { id: "fragata", nombre: "Fragata de Asalto", emoji: "⛵", icono: "assault-frigate", precio: 800, precioDiamantes: 0, rareza: "Raro", ataque: 48, vida: 70, velocidad: 3, espacio: 5, rango: 60, descripcion: "Nave de combate versátil" },
                { id: "destructor", nombre: "Destructor Clase A", emoji: "🚢", icono: "destroyer", precio: 2000, precioDiamantes: 0, rareza: "Épico", ataque: 72, vida: 100, velocidad: 2, espacio: 8, rango: 70, descripcion: "Dominio naval absoluto" },
                { id: "kraken", nombre: "Kraken Mecánico", emoji: "🦑", icono: "mech-kraken", precio: 10000, precioDiamantes: 100, rareza: "Mítico", ataque: 110, vida: 150, velocidad: 2, espacio: 10, rango: 80, descripcion: "Terror de los siete mares" },
                { id: "acorazado", nombre: "Acorazado Leviatán", emoji: "⛴️", icono: "leviathan", precio: 20000, precioDiamantes: 300, rareza: "Legendario", ataque: 150, vida: 200, velocidad: 1, espacio: 12, rango: 100, descripcion: "Fortaleza flotante invencible" }
            ]
        },
        aire: {
            nombre: "Aéreo",
            emoji: "✈️",
            rangoRequerido: 7,
            capacidadMaxima: 20,
            unidades: [
                { id: "dron", nombre: "Dron de Combate", emoji: "🛸", icono: "combat-drone", precio: 0, precioDiamantes: 0, rareza: "Común", ataque: 20, vida: 18, velocidad: 5, espacio: 1, rango: 50, descripcion: "Explorador aéreo autónomo" },
                { id: "helicoptero", nombre: "Helicóptero Apache", emoji: "🚁", icono: "apache", precio: 600, precioDiamantes: 0, rareza: "Común", ataque: 32, vida: 35, velocidad: 4, espacio: 3, rango: 70, descripcion: "Apoyo aéreo táctico" },
                { id: "caza", nombre: "Caza Interceptor", emoji: "🛩️", icono: "interceptor", precio: 1000, precioDiamantes: 0, rareza: "Raro", ataque: 55, vida: 42, velocidad: 5, espacio: 4, rango: 90, descripcion: "Supremacía del cielo" },
                { id: "bombardero", nombre: "Bombardero Estratégico", emoji: "✈️", icono: "bomber", precio: 2500, precioDiamantes: 0, rareza: "Épico", ataque: 88, vida: 65, velocidad: 2, espacio: 6, rango: 60, descripcion: "Lluvia de destrucción" },
                { id: "fenix", nombre: "Fénix de Plasma", emoji: "🔥", icono: "plasma-phoenix", precio: 12500, precioDiamantes: 125, rareza: "Mítico", ataque: 130, vida: 90, velocidad: 4, espacio: 8, rango: 80, descripcion: "Ave de fuego inmortal" },
                { id: "stealth", nombre: "Espectro Furtivo", emoji: "👻", icono: "stealth-specter", precio: 35000, precioDiamantes: 500, rareza: "Legendario", ataque: 180, vida: 75, velocidad: 5, espacio: 10, rango: 100, descripcion: "Invisible e imparable" }
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
    // SISTEMA DE MAPAS - SHOOTER 1v1 TIERRA
    // 20 mapas organizados por rareza/dificultad
    // ==========================================
    
    this.mapasShooter = {
        tierra: [
            // ==========================================
            // NIVEL 1: COMÚN - Terrenos Abiertos (4 mapas)
            // Desbloqueados desde el inicio
            // ==========================================
            {
                id: "llanura_infinita",
                nombre: "La Llanura Infinita",
                emoji: "🌾",
                rareza: "Común",
                nivel: 1,
                precio: 0,
                desbloqueado: true,
                descripcion: "Campo de hierba plano y extenso. No hay dónde esconderse. Duelo de puntería.",
                config: {
                    ancho: 1200,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #87CEEB 0%, #98D8AA 60%, #4A7C23 100%)",
                    suelo: "#4A7C23",
                    gravedad: 0.6,
                    obstaculos: [],
                    spawnPoints: [{ x: 100, y: 500 }, { x: 1100, y: 500 }],
                    decoraciones: [
                        { tipo: "hierba", x: 200, y: 520 },
                        { tipo: "hierba", x: 500, y: 520 },
                        { tipo: "hierba", x: 800, y: 520 }
                    ]
                }
            },
            {
                id: "circulo_duelo",
                nombre: "El Círculo de Duelo",
                emoji: "⭕",
                rareza: "Común",
                nivel: 1,
                precio: 0,
                desbloqueado: true,
                descripcion: "Arena circular pequeña con muros. Combate cercano obligatorio.",
                config: {
                    ancho: 800,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #5D4E37 0%, #3D2E1F 100%)",
                    suelo: "#3D2E1F",
                    gravedad: 0.6,
                    forma: "circular",
                    obstaculos: [
                        { tipo: "muro", x: 0, y: 200, ancho: 50, alto: 400, indestructible: true },
                        { tipo: "muro", x: 750, y: 200, ancho: 50, alto: 400, indestructible: true }
                    ],
                    spawnPoints: [{ x: 150, y: 500 }, { x: 650, y: 500 }]
                }
            },
            {
                id: "campo_tiro",
                nombre: "Campo de Tiro Básico",
                emoji: "🎯",
                rareza: "Común",
                nivel: 1,
                precio: 100,
                desbloqueado: false,
                descripcion: "Terreno plano con líneas de distancia. Ideal para calentar.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #87CEEB 0%, #C4A76C 100%)",
                    suelo: "#8B7355",
                    gravedad: 0.6,
                    obstaculos: [],
                    spawnPoints: [{ x: 100, y: 500 }, { x: 900, y: 500 }],
                    lineasDistancia: [200, 400, 600, 800]
                }
            },
            {
                id: "colina_unica",
                nombre: "La Colina Única",
                emoji: "⛰️",
                rareza: "Común",
                nivel: 1,
                precio: 200,
                desbloqueado: false,
                descripcion: "Llanura con una colina central. Controla la cima para ventaja de altura.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #87CEEB 0%, #98D8AA 100%)",
                    suelo: "#4A7C23",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "colina", x: 400, y: 400, ancho: 200, alto: 150, forma: "triangulo" }
                    ],
                    spawnPoints: [{ x: 100, y: 500 }, { x: 900, y: 500 }]
                }
            },
            
            // ==========================================
            // NIVEL 2: RARO - Cobertura Ligera (4 mapas)
            // Requieren 500 monedas para desbloquear
            // ==========================================
            {
                id: "campo_menhires",
                nombre: "Campo de Menhires",
                emoji: "🗿",
                rareza: "Raro",
                nivel: 2,
                precio: 500,
                desbloqueado: false,
                descripcion: "Rocas monolíticas para cubrirse. Ideal para peek-shooting.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #708090 0%, #556B2F 100%)",
                    suelo: "#4A5D23",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "roca", x: 200, y: 400, ancho: 60, alto: 150, indestructible: true },
                        { tipo: "roca", x: 400, y: 420, ancho: 50, alto: 130, indestructible: true },
                        { tipo: "roca", x: 600, y: 410, ancho: 55, alto: 140, indestructible: true },
                        { tipo: "roca", x: 800, y: 400, ancho: 60, alto: 150, indestructible: true }
                    ],
                    spawnPoints: [{ x: 50, y: 500 }, { x: 950, y: 500 }]
                }
            },
            {
                id: "sabana_alta",
                nombre: "La Sabana Alta",
                emoji: "🌿",
                rareza: "Raro",
                nivel: 2,
                precio: 750,
                desbloqueado: false,
                descripcion: "Hierba alta hasta la cintura. Agáchate para ocultarte.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #F4A460 0%, #DAA520 100%)",
                    suelo: "#8B7355",
                    gravedad: 0.6,
                    hierbaAlta: true,
                    alturaHierba: 40,
                    obstaculos: [],
                    spawnPoints: [{ x: 100, y: 500 }, { x: 900, y: 500 }]
                }
            },
            {
                id: "cauce_seco",
                nombre: "El Cauce Seco",
                emoji: "🏜️",
                rareza: "Raro",
                nivel: 2,
                precio: 1000,
                desbloqueado: false,
                descripcion: "Trinchera natural. Cobertura baja pero movimiento canalizado.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #DEB887 0%, #D2691E 100%)",
                    suelo: "#8B4513",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "trinchera", x: 0, y: 450, ancho: 1000, alto: 80, profundidad: 50 }
                    ],
                    spawnPoints: [{ x: 100, y: 500 }, { x: 900, y: 500 }]
                }
            },
            {
                id: "ruinas_desierto",
                nombre: "Ruinas del Desierto",
                emoji: "🏚️",
                rareza: "Raro",
                nivel: 2,
                precio: 1500,
                desbloqueado: false,
                descripcion: "Muros de adobe a media altura. Sin techo pero buena cobertura.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #F5DEB3 0%, #DEB887 100%)",
                    suelo: "#C4A76C",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "muro_bajo", x: 250, y: 400, ancho: 100, alto: 80 },
                        { tipo: "muro_bajo", x: 500, y: 380, ancho: 80, alto: 100 },
                        { tipo: "muro_bajo", x: 700, y: 400, ancho: 100, alto: 80 }
                    ],
                    spawnPoints: [{ x: 80, y: 500 }, { x: 920, y: 500 }]
                }
            },
            
            // ==========================================
            // NIVEL 3: ÉPICO - Verticalidad (4 mapas)
            // Requieren 2500 monedas
            // ==========================================
            {
                id: "bosque_coniferas",
                nombre: "Bosque de Coníferas",
                emoji: "🌲",
                rareza: "Épico",
                nivel: 3,
                precio: 2500,
                desbloqueado: false,
                descripcion: "Árboles densos que bloquean visión. El sonido es crucial.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #228B22 0%, #006400 100%)",
                    suelo: "#2E4A1C",
                    gravedad: 0.6,
                    oscuridad: 0.3,
                    obstaculos: [
                        { tipo: "arbol", x: 150, y: 350, ancho: 40, alto: 200, cobertura: true },
                        { tipo: "arbol", x: 300, y: 340, ancho: 45, alto: 210, cobertura: true },
                        { tipo: "arbol", x: 500, y: 360, ancho: 40, alto: 190, cobertura: true },
                        { tipo: "arbol", x: 700, y: 345, ancho: 42, alto: 205, cobertura: true },
                        { tipo: "arbol", x: 850, y: 350, ancho: 40, alto: 200, cobertura: true }
                    ],
                    spawnPoints: [{ x: 50, y: 500 }, { x: 950, y: 500 }]
                }
            },
            {
                id: "desfiladero",
                nombre: "Desfiladero Rocoso",
                emoji: "🏔️",
                rareza: "Épico",
                nivel: 3,
                precio: 3500,
                desbloqueado: false,
                descripcion: "Cañón estrecho con paredes altas. Verticalidad extrema.",
                config: {
                    ancho: 800,
                    alto: 700,
                    fondo: "linear-gradient(180deg, #696969 0%, #2F4F4F 100%)",
                    suelo: "#3D3D3D",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "plataforma", x: 100, y: 350, ancho: 150, alto: 20 },
                        { tipo: "plataforma", x: 550, y: 350, ancho: 150, alto: 20 },
                        { tipo: "plataforma", x: 300, y: 250, ancho: 200, alto: 20 },
                        { tipo: "roca", x: 0, y: 0, ancho: 80, alto: 600, indestructible: true },
                        { tipo: "roca", x: 720, y: 0, ancho: 80, alto: 600, indestructible: true }
                    ],
                    spawnPoints: [{ x: 150, y: 600 }, { x: 650, y: 600 }]
                }
            },
            {
                id: "manglar",
                nombre: "El Manglar Traicionero",
                emoji: "🌴",
                rareza: "Épico",
                nivel: 3,
                precio: 4500,
                desbloqueado: false,
                descripcion: "Agua que ralentiza. Raíces para esconderse.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #2F4F4F 0%, #1C3A3A 100%)",
                    suelo: "#1C3A3A",
                    gravedad: 0.6,
                    agua: { nivel: 480, ralentizacion: 0.5 },
                    obstaculos: [
                        { tipo: "raiz", x: 200, y: 400, ancho: 60, alto: 120, cobertura: true },
                        { tipo: "raiz", x: 450, y: 410, ancho: 70, alto: 110, cobertura: true },
                        { tipo: "raiz", x: 700, y: 395, ancho: 65, alto: 125, cobertura: true }
                    ],
                    spawnPoints: [{ x: 80, y: 500 }, { x: 920, y: 500 }]
                }
            },
            {
                id: "cuevas",
                nombre: "Sistema de Cuevas",
                emoji: "🕳️",
                rareza: "Épico",
                nivel: 3,
                precio: 6000,
                desbloqueado: false,
                descripcion: "Combate subterráneo. Pasillos estrechos y múltiples niveles.",
                config: {
                    ancho: 900,
                    alto: 700,
                    fondo: "#1a1a1a",
                    suelo: "#2a2a2a",
                    gravedad: 0.6,
                    oscuridad: 0.5,
                    obstaculos: [
                        { tipo: "plataforma", x: 0, y: 500, ancho: 350, alto: 30 },
                        { tipo: "plataforma", x: 550, y: 500, ancho: 350, alto: 30 },
                        { tipo: "plataforma", x: 200, y: 350, ancho: 500, alto: 25 },
                        { tipo: "plataforma", x: 100, y: 200, ancho: 300, alto: 25 },
                        { tipo: "plataforma", x: 500, y: 200, ancho: 300, alto: 25 },
                        { tipo: "estalactita", x: 400, y: 0, ancho: 100, alto: 120 }
                    ],
                    spawnPoints: [{ x: 100, y: 470 }, { x: 800, y: 470 }]
                }
            },
            
            // ==========================================
            // NIVEL 4: MÍTICO - Entornos Urbanos (4 mapas)
            // Requieren 10000 monedas
            // ==========================================
            {
                id: "pueblo_fantasma",
                nombre: "El Pueblo Fantasma",
                emoji: "🏘️",
                rareza: "Mítico",
                nivel: 4,
                precio: 10000,
                precioDiamantes: 50,
                desbloqueado: false,
                descripcion: "Casas abandonadas. Combate en calles y limpieza de habitaciones.",
                config: {
                    ancho: 1100,
                    alto: 650,
                    fondo: "linear-gradient(180deg, #4A4A4A 0%, #2E2E2E 100%)",
                    suelo: "#3D3D3D",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "edificio", x: 100, y: 300, ancho: 150, alto: 250, ventanas: true, entrable: true },
                        { tipo: "edificio", x: 450, y: 350, ancho: 200, alto: 200, ventanas: true, entrable: true },
                        { tipo: "edificio", x: 850, y: 300, ancho: 150, alto: 250, ventanas: true, entrable: true }
                    ],
                    spawnPoints: [{ x: 50, y: 550 }, { x: 1050, y: 550 }]
                }
            },
            {
                id: "contenedores",
                nombre: "Patio de Contenedores",
                emoji: "📦",
                rareza: "Mítico",
                nivel: 4,
                precio: 15000,
                precioDiamantes: 75,
                desbloqueado: false,
                descripcion: "Laberinto de contenedores. Pasillos estrechos y esquinas ciegas.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "#4A5568",
                    suelo: "#2D3748",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "contenedor", x: 150, y: 450, ancho: 100, alto: 80, color: "#E53E3E" },
                        { tipo: "contenedor", x: 150, y: 370, ancho: 100, alto: 80, color: "#3182CE" },
                        { tipo: "contenedor", x: 350, y: 400, ancho: 100, alto: 80, color: "#38A169" },
                        { tipo: "contenedor", x: 500, y: 320, ancho: 100, alto: 80, color: "#D69E2E" },
                        { tipo: "contenedor", x: 500, y: 400, ancho: 100, alto: 80, color: "#805AD5" },
                        { tipo: "contenedor", x: 700, y: 450, ancho: 100, alto: 80, color: "#E53E3E" },
                        { tipo: "contenedor", x: 700, y: 370, ancho: 100, alto: 80, color: "#3182CE" },
                        { tipo: "contenedor", x: 850, y: 400, ancho: 100, alto: 80, color: "#38A169" }
                    ],
                    spawnPoints: [{ x: 50, y: 550 }, { x: 950, y: 550 }]
                }
            },
            {
                id: "zona_cero",
                nombre: "Zona Cero Urbana",
                emoji: "🏙️",
                rareza: "Mítico",
                nivel: 4,
                precio: 20000,
                precioDiamantes: 100,
                desbloqueado: false,
                descripcion: "Ciudad en ruinas. Edificios destruidos, ventanas, tejados.",
                config: {
                    ancho: 1200,
                    alto: 700,
                    fondo: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
                    suelo: "#0f0f23",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "ruina", x: 50, y: 250, ancho: 180, alto: 350, pisos: 3 },
                        { tipo: "ruina", x: 350, y: 350, ancho: 150, alto: 250, pisos: 2 },
                        { tipo: "escombros", x: 550, y: 500, ancho: 100, alto: 50 },
                        { tipo: "ruina", x: 700, y: 300, ancho: 160, alto: 300, pisos: 3 },
                        { tipo: "ruina", x: 1000, y: 350, ancho: 150, alto: 250, pisos: 2 }
                    ],
                    spawnPoints: [{ x: 30, y: 600 }, { x: 1170, y: 600 }]
                }
            },
            {
                id: "bunker_subterraneo",
                nombre: "Complejo de Búnkeres",
                emoji: "🚪",
                rareza: "Mítico",
                nivel: 4,
                precio: 25000,
                precioDiamantes: 125,
                desbloqueado: false,
                descripcion: "Pasillos de hormigón. Claustrofóbico con puntos de estrangulamiento.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "#1C1C1C",
                    suelo: "#2C2C2C",
                    gravedad: 0.6,
                    oscuridad: 0.4,
                    obstaculos: [
                        { tipo: "muro_bunker", x: 200, y: 0, ancho: 30, alto: 350 },
                        { tipo: "muro_bunker", x: 200, y: 450, ancho: 30, alto: 150 },
                        { tipo: "muro_bunker", x: 500, y: 250, ancho: 30, alto: 350 },
                        { tipo: "muro_bunker", x: 770, y: 0, ancho: 30, alto: 350 },
                        { tipo: "muro_bunker", x: 770, y: 450, ancho: 30, alto: 150 },
                        { tipo: "puerta", x: 200, y: 350, ancho: 30, alto: 100, abierta: true },
                        { tipo: "puerta", x: 770, y: 350, ancho: 30, alto: 100, abierta: true }
                    ],
                    spawnPoints: [{ x: 80, y: 500 }, { x: 920, y: 500 }]
                }
            },
            
            // ==========================================
            // NIVEL 5: LEGENDARIO - Mapas Especiales (4 mapas)
            // Requieren 50000 monedas + diamantes
            // ==========================================
            {
                id: "pista_americana",
                nombre: "La Pista Americana",
                emoji: "🏃",
                rareza: "Legendario",
                nivel: 5,
                precio: 50000,
                precioDiamantes: 200,
                desbloqueado: false,
                descripcion: "Campo de entrenamiento militar. Obstáculos físicos durante el combate.",
                config: {
                    ancho: 1200,
                    alto: 600,
                    fondo: "linear-gradient(180deg, #87CEEB 0%, #8B7355 100%)",
                    suelo: "#6B5344",
                    gravedad: 0.6,
                    obstaculos: [
                        { tipo: "muro_saltar", x: 200, y: 450, ancho: 80, alto: 60 },
                        { tipo: "red_reptar", x: 350, y: 480, ancho: 150, alto: 40, agacharse: true },
                        { tipo: "viga", x: 550, y: 400, ancho: 150, alto: 15, equilibrio: true },
                        { tipo: "foso", x: 750, y: 520, ancho: 100, alto: 80, daño: 10 },
                        { tipo: "muro_saltar", x: 900, y: 450, ancho: 80, alto: 60 }
                    ],
                    spawnPoints: [{ x: 50, y: 500 }, { x: 1150, y: 500 }]
                }
            },
            {
                id: "tormenta_arena",
                nombre: "Tormenta de Arena",
                emoji: "🌪️",
                rareza: "Legendario",
                nivel: 5,
                precio: 75000,
                precioDiamantes: 300,
                desbloqueado: false,
                descripcion: "Visibilidad reducida a 5-10 metros. Combate caótico a quemarropa.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "#C4A76C",
                    suelo: "#8B7355",
                    gravedad: 0.6,
                    tormenta: {
                        visibilidad: 150, // pixeles de visibilidad
                        particulas: true,
                        direccion: "izquierda"
                    },
                    obstaculos: [
                        { tipo: "roca_arena", x: 300, y: 450, ancho: 70, alto: 100 },
                        { tipo: "roca_arena", x: 600, y: 440, ancho: 80, alto: 110 }
                    ],
                    spawnPoints: [{ x: 100, y: 500 }, { x: 900, y: 500 }]
                }
            },
            {
                id: "espejo_tactico",
                nombre: "El Espejo Táctico",
                emoji: "🪞",
                rareza: "Legendario",
                nivel: 5,
                precio: 100000,
                precioDiamantes: 400,
                desbloqueado: false,
                descripcion: "Mapa perfectamente simétrico. No favorece a nadie. Competitivo puro.",
                config: {
                    ancho: 1000,
                    alto: 600,
                    fondo: "linear-gradient(90deg, #1E3A5F 0%, #2E4A6F 50%, #1E3A5F 100%)",
                    suelo: "#1E3A5F",
                    gravedad: 0.6,
                    simetrico: true,
                    obstaculos: [
                        // Lado izquierdo
                        { tipo: "cobertura", x: 150, y: 400, ancho: 80, alto: 120 },
                        { tipo: "cobertura", x: 300, y: 300, ancho: 60, alto: 80 },
                        { tipo: "cobertura", x: 200, y: 200, ancho: 100, alto: 60 },
                        // Centro
                        { tipo: "cobertura_central", x: 450, y: 350, ancho: 100, alto: 150 },
                        // Lado derecho (espejo)
                        { tipo: "cobertura", x: 770, y: 400, ancho: 80, alto: 120 },
                        { tipo: "cobertura", x: 640, y: 300, ancho: 60, alto: 80 },
                        { tipo: "cobertura", x: 700, y: 200, ancho: 100, alto: 60 }
                    ],
                    spawnPoints: [{ x: 50, y: 500 }, { x: 950, y: 500 }]
                }
            },
            {
                id: "fabrica_vertical",
                nombre: "La Fábrica Vertical",
                emoji: "🏭",
                rareza: "Legendario",
                nivel: 5,
                precio: 150000,
                precioDiamantes: 500,
                desbloqueado: false,
                descripcion: "6 niveles de pasarelas. El 90% del combate es mirando arriba o abajo.",
                config: {
                    ancho: 900,
                    alto: 800,
                    fondo: "#2D2D2D",
                    suelo: "#1A1A1A",
                    gravedad: 0.6,
                    vertical: true,
                    obstaculos: [
                        // Nivel 1 (suelo)
                        { tipo: "pasarela", x: 0, y: 750, ancho: 900, alto: 20 },
                        // Nivel 2
                        { tipo: "pasarela", x: 50, y: 620, ancho: 250, alto: 15 },
                        { tipo: "pasarela", x: 600, y: 620, ancho: 250, alto: 15 },
                        // Nivel 3
                        { tipo: "pasarela", x: 200, y: 490, ancho: 500, alto: 15 },
                        // Nivel 4
                        { tipo: "pasarela", x: 50, y: 360, ancho: 300, alto: 15 },
                        { tipo: "pasarela", x: 550, y: 360, ancho: 300, alto: 15 },
                        // Nivel 5
                        { tipo: "pasarela", x: 250, y: 230, ancho: 400, alto: 15 },
                        // Nivel 6 (techo)
                        { tipo: "pasarela", x: 100, y: 100, ancho: 200, alto: 15 },
                        { tipo: "pasarela", x: 600, y: 100, ancho: 200, alto: 15 },
                        // Escaleras
                        { tipo: "escalera", x: 350, y: 490, alto: 130 },
                        { tipo: "escalera", x: 550, y: 360, alto: 130 },
                        { tipo: "escalera", x: 350, y: 230, alto: 130 }
                    ],
                    spawnPoints: [{ x: 100, y: 730 }, { x: 800, y: 730 }]
                }
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
        dominiosDesbloqueados: ['tierra'],
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
        }
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
    };
    
    // Auto-guardar cada 30 segundos
    this.iniciarAutoGuardado = function() {
        setInterval(() => {
            this.guardarProgreso();
        }, 30000);
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
        const rango = this.sistemRangos.rangos[this.datosJugador.rangoActual];
        const liga = this.sistemRangos.ligas[this.datosJugador.ligaActual];
        return {
            ...rango,
            liga: liga,
            nombreCompleto: `${rango.nombre} ${liga}`
        };
    };

    // Verificar si un dominio está desbloqueado
    this.dominioDesbloqueado = function(dominio) {
        return this.datosJugador.dominiosDesbloqueados.includes(dominio);
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

        // Determinar si es shooter (tierra) o sistema clásico
        const esShooter = dominio === 'tierra' && dataAtaque.tipoJuego === 'shooter';
        
        const menu = `
            <div class="domain-menu ${temaClases[dominio]}" id="domainMenu">
                <div class="domain-menu-header">
                    <div class="domain-title-container">
                        <span class="domain-big-icon">${dataAtaque.emoji}</span>
                        <h2 class="domain-title">${esShooter ? 'Shooter 1v1' : 'Combate'} ${dataAtaque.nombre}</h2>
                    </div>
                    <div class="domain-decoration">
                        ${decoraciones[dominio].map(d => `<span class="deco-item">${d}</span>`).join('')}
                    </div>
                </div>
                
                ${!esShooter ? `
                <div class="cuartel-info-bar">
                    <span class="cuartel-icon">🏰</span>
                    <span class="cuartel-text">${this.nombreBasePrincipal[dominio]} Nv.${nivelCuartel}</span>
                    <span class="cuartel-desc">${infoCuartel.descripcion}</span>
                </div>
                ` : `
                <div class="cuartel-info-bar">
                    <span class="cuartel-icon">🎯</span>
                    <span class="cuartel-text">Combate en Arena</span>
                    <span class="cuartel-desc">Controla a tu soldado y derrota al enemigo</span>
                </div>
                `}
                
                <div class="domain-menu-content">
                    ${!esShooter ? `
                    <button class="domain-menu-btn btn-aldea-domain" id="btnMiAldea">
                        <span class="btn-icon">🏘️</span>
                        <span class="btn-text">Mi Aldea</span>
                        <span class="btn-desc">Gestiona tu base y defensas</span>
                    </button>
                    ` : ''}
                    
                    <button class="domain-menu-btn btn-unjugador-domain" id="btnUnJugadorDomain">
                        <span class="btn-icon">⚔️</span>
                        <span class="btn-text">${esShooter ? 'Jugar vs IA' : 'Atacar'}</span>
                        <span class="btn-desc">${esShooter ? 'Combate contra la inteligencia artificial' : 'Ataca bases enemigas'}</span>
                    </button>
                    
                    <button class="domain-menu-btn btn-multijugador-domain" id="btnMultijugadorDomain">
                        <span class="btn-icon">👥</span>
                        <span class="btn-text">Multijugador</span>
                        <span class="btn-desc">${esShooter ? 'Duelo 1v1 contra otro jugador' : 'Batalla contra otros jugadores'}</span>
                    </button>
                    
                    <button class="domain-menu-btn btn-personalizar-domain" id="btnPersonalizarDomain">
                        <span class="btn-icon">🏪</span>
                        <span class="btn-text">Tienda</span>
                        <span class="btn-desc">${esShooter ? 'Compra soldados y mapas' : 'Compra unidades y defensas'}</span>
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
        
        if (!esShooter) {
            $("#btnMiAldea").on("click", () => cw.mostrarMiAldea(dominio));
        }
        $("#btnUnJugadorDomain").on("click", () => cw.mostrarPanelUnJugadorDominio(dominio));
        $("#btnMultijugadorDomain").on("click", () => cw.mostrarPanelMultijugadorDominio(dominio));
        $("#btnPersonalizarDomain").on("click", () => cw.mostrarTienda(dominio));
        $("#btnSalirDomain").on("click", () => {
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
        const esShooter = dominio === 'tierra' && dataAtaque.tipoJuego === 'shooter';

        const panel = `
            <div class="shop-panel ${temaClases[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">🏪 Tienda ${dataAtaque.nombre}</h2>
                    <div class="player-resources">
                        <div class="player-coins">💰 <span id="playerCoins">${this.datosJugador.monedas}</span></div>
                        <div class="player-diamonds">💎 <span id="playerDiamonds">${this.datosJugador.diamantes}</span></div>
                    </div>
                    <button class="btn-back" id="btnVolverDominio">← Volver</button>
                </div>
                
                <div class="shop-tabs">
                    <button class="shop-tab active" data-tab="ataque">${esShooter ? '🪖 Soldados' : '⚔️ Ataque'}</button>
                    <button class="shop-tab" data-tab="${esShooter ? 'mapas' : 'defensa'}">${esShooter ? '🗺️ Mapas' : '🛡️ Defensa'}</button>
                </div>
                
                <div class="shop-content" id="shopContent">
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        this.mostrarTabTienda(dominio, 'ataque');
        
        $(".shop-tab").on("click", function() {
            $(".shop-tab").removeClass("active");
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
        
        if (tab === 'ataque') {
            // Para tierra shooter, usar tropas en lugar de unidades
            if (dominio === 'tierra' && this.unidadesAtaque.tierra.tipoJuego === 'shooter') {
                items = this.unidadesAtaque.tierra.tropas || [];
                tipo = 'tropa';
            } else {
                items = this.unidadesAtaque[dominio].unidades || [];
                tipo = 'unidad';
            }
        } else {
            items = this.defensas[dominio]?.estructuras || [];
            tipo = 'defensa';
        }

        const dominioDesbloqueado = this.dominioDesbloqueado(dominio);
        
        let html = '<div class="shop-grid">';
        
        items.forEach(item => {
            const desbloqueado = tipo === 'unidad' 
                ? this.datosJugador.unidadesDesbloqueadas[item.id]
                : tipo === 'tropa'
                ? (item.desbloqueado || this.datosJugador.tropasDesbloqueadas?.[item.id])
                : this.datosJugador.defensasDesbloqueadas[item.id];
            
            const rarezaClase = {
                'Común': 'rareza-comun',
                'Raro': 'rareza-raro',
                'Épico': 'rareza-epico',
                'Mítico': 'rareza-mitico',
                'Legendario': 'rareza-legendario'
            }[item.rareza];

            // Un item está bloqueado si el dominio no está desbloqueado Y no es gratis
            const bloqueado = !dominioDesbloqueado && item.precio > 0;
            // Un item necesita candado si NO está comprado Y tiene precio > 0
            const necesitaCandado = !desbloqueado && item.precio > 0;
            const ilustracion = this.generarIlustracion(item, tipo);
            
            // Obtener stats según si es defensa con niveles o unidad
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
            } else {
                statsHTML = `
                    <div class="card-stats">
                        ${item.ataque ? `<span>⚔️ ${item.ataque}</span>` : ''}
                        <span>❤️ ${item.vida}</span>
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
            if (!desbloqueado && item.precio > 0) cardClasses += ' not-owned';
            
            html += `
                <div class="${cardClasses}">
                    ${necesitaCandado && !desbloqueado ? `
                        <div class="card-lock-overlay">
                            <div class="lock-icon">🔒</div>
                            ${bloqueado ? '<div class="lock-text">BLOQUEADO</div>' : ''}
                        </div>
                    ` : ''}
                    <div class="card-rareza">${item.rareza}</div>
                    ${ilustracion}
                    <div class="card-emoji">${item.emoji}</div>
                    <div class="card-name">${item.nombre}</div>
                    ${statsHTML}
                    <div class="card-desc">${item.descripcion}</div>
                    ${desbloqueado ? `
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
                
                html += `
                    <div class="shop-item rareza-${rarezaClase} ${desbloqueado ? 'owned' : ''}">
                        <div class="item-header">
                            <span class="item-emoji">${mapa.emoji}</span>
                            <span class="item-name">${mapa.nombre}</span>
                        </div>
                        <div class="item-body">
                            <p class="item-desc">${mapa.descripcion || ''}</p>
                            <div class="item-stats">
                                <span>📐 ${mapa.config.ancho}x${mapa.config.alto}</span>
                                <span>🧱 ${mapa.config.obstaculos?.length || 0} obstáculos</span>
                            </div>
                        </div>
                        <div class="item-footer">
                            ${desbloqueado ? `
                                <span class="item-owned">✅ Desbloqueado</span>
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
    
    this.comprarMapaTienda = function(mapaId) {
        const mapa = this.mapasShooter.tierra.find(m => m.id === mapaId);
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
        this.mostrarTabMapas('tierra');
    }

    // ==========================================
    // PANEL UN JUGADOR - SHOOTER 1v1
    // ==========================================
    
    this.mostrarPanelUnJugadorDominio = function(dominio) {
        this.limpiar();
        const data = this.unidadesAtaque[dominio];
        
        // Si es dominio tierra, mostrar el nuevo sistema shooter
        if (dominio === 'tierra' && data.tipoJuego === 'shooter') {
            this.mostrarPanelShooterTierra();
            return;
        }
        
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
        
        const panel = `
            <div class="game-panel ${temaClases[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">${data.emoji} Un Jugador - ${data.nombre}</h2>
                    <button class="btn-back" id="btnVolverDominio">← Volver</button>
                </div>
                
                <div class="difficulty-section">
                    <p style="color: var(--color-plata); margin-bottom: 10px;">Selecciona la dificultad:</p>
                    
                    <div class="difficulty-grid">
                        <button class="difficulty-btn diff-beginner" data-difficulty="beginner">
                            <span class="diff-name">🌱 Principiante</span>
                        </button>
                        <button class="difficulty-btn diff-amateur" data-difficulty="amateur">
                            <span class="diff-name">⭐ Amateur</span>
                        </button>
                        <button class="difficulty-btn diff-professional" data-difficulty="professional">
                            <span class="diff-name">🏆 Profesional</span>
                        </button>
                        <button class="difficulty-btn diff-legend" data-difficulty="legend">
                            <span class="diff-name">👑 Leyenda</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        $("#btnVolverDominio").on("click", () => cw.mostrarMenuDominio(dominio));
        
        $(".difficulty-btn").on("click", function() {
            cw.iniciarPartidaVsIA(dominio, $(this).data("difficulty"));
        });
    }
    
    // ==========================================
    // SISTEMA SHOOTER TIERRA - PANEL PRINCIPAL
    // ==========================================
    
    this.mostrarPanelShooterTierra = function() {
        this.limpiar();
        this.setDomainBackground('domain-bg-tierra');
        
        const tropas = this.unidadesAtaque.tierra.tropas;
        const mapas = this.mapasShooter.tierra;
        
        // Agrupar mapas por rareza
        const mapasPorRareza = {
            'Común': mapas.filter(m => m.rareza === 'Común'),
            'Raro': mapas.filter(m => m.rareza === 'Raro'),
            'Épico': mapas.filter(m => m.rareza === 'Épico'),
            'Mítico': mapas.filter(m => m.rareza === 'Mítico'),
            'Legendario': mapas.filter(m => m.rareza === 'Legendario')
        };
        
        const panel = `
            <div class="shooter-panel">
                <div class="panel-header">
                    <h2 class="panel-title">🎖️ COMBATE TERRESTRE - SHOOTER 1v1</h2>
                    <button class="btn-back" id="btnVolverDominio">← Volver</button>
                </div>
                
                <!-- Selección de Personaje -->
                <div class="shooter-section">
                    <h3 class="section-title">🪖 SELECCIONA TU SOLDADO</h3>
                    <div class="tropas-grid">
                        ${tropas.map((tropa, i) => `
                            <div class="tropa-card ${tropa.desbloqueado ? '' : 'bloqueada'} rareza-${tropa.rareza.toLowerCase()}" 
                                 data-tropa="${tropa.id}" onclick="cw.seleccionarTropaShooter('${tropa.id}')">
                                <div class="tropa-emoji">${tropa.emoji}</div>
                                <div class="tropa-nombre">${tropa.nombre}</div>
                                <div class="tropa-rareza">${tropa.rareza}</div>
                                <div class="tropa-stats">
                                    <span>❤️${tropa.stats.vida}</span>
                                    <span>⚡${tropa.stats.velocidad}</span>
                                </div>
                                ${!tropa.desbloqueado ? `
                                    <div class="tropa-precio">
                                        ${tropa.precio > 0 ? `💰${tropa.precio}` : ''}
                                        ${tropa.precioDiamantes > 0 ? `💎${tropa.precioDiamantes}` : ''}
                                    </div>
                                    <button class="btn-desbloquear" onclick="event.stopPropagation(); cw.desbloquearTropaShooter('${tropa.id}')">
                                        🔓 Desbloquear
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Info del personaje seleccionado -->
                <div class="shooter-section" id="infoTropaSeleccionada" style="display: none;">
                    <h3 class="section-title">📋 ARSENAL</h3>
                    <div id="arsenalContent"></div>
                </div>
                
                <!-- Selección de Mapa -->
                <div class="shooter-section">
                    <h3 class="section-title">🗺️ SELECCIONA EL CAMPO DE BATALLA</h3>
                    
                    ${Object.entries(mapasPorRareza).map(([rareza, mapasRareza]) => `
                        <div class="mapas-categoria">
                            <h4 class="categoria-titulo rareza-${rareza.toLowerCase()}">${this.getEmojiRareza(rareza)} ${rareza}</h4>
                            <div class="mapas-grid">
                                ${mapasRareza.map(mapa => `
                                    <div class="mapa-card ${mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapa.id) ? '' : 'bloqueado'} rareza-${mapa.rareza.toLowerCase()}"
                                         data-mapa="${mapa.id}" onclick="cw.seleccionarMapaShooter('${mapa.id}')">
                                        <div class="mapa-emoji">${mapa.emoji}</div>
                                        <div class="mapa-nombre">${mapa.nombre}</div>
                                        ${!(mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapa.id)) ? `
                                            <div class="mapa-precio">
                                                ${mapa.precio > 0 ? `💰${mapa.precio.toLocaleString()}` : ''}
                                                ${mapa.precioDiamantes ? `💎${mapa.precioDiamantes}` : ''}
                                            </div>
                                        ` : '<div class="mapa-desbloqueado">✅</div>'}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- Botón de iniciar -->
                <div class="shooter-actions">
                    <button class="btn-iniciar-combate" id="btnIniciarShooter" disabled>
                        ⚔️ INICIAR COMBATE
                    </button>
                    <p id="seleccionStatus" style="color: #aaa; margin-top: 10px;">
                        Selecciona un soldado y un mapa para comenzar
                    </p>
                </div>
            </div>
        `;
        
        $("#au").html(panel);
        
        // Inicializar selecciones
        this.shooterSeleccion = {
            tropa: null,
            mapa: null
        };
        
        // Inicializar array de mapas si no existe
        if (!this.datosJugador.mapasDesbloqueados) {
            this.datosJugador.mapasDesbloqueados = ['llanura_infinita', 'circulo_duelo'];
        }
        
        $("#btnVolverDominio").on("click", () => cw.mostrarMenuDominio('tierra'));
        
        $("#btnIniciarShooter").on("click", () => {
            if (this.shooterSeleccion.tropa && this.shooterSeleccion.mapa) {
                this.iniciarJuegoShooter('tierra', this.shooterSeleccion.tropa, this.shooterSeleccion.mapa, 'ia');
            }
        });
        
        // Auto-seleccionar soldado si está desbloqueado
        if (tropas[0].desbloqueado) {
            this.seleccionarTropaShooter('soldado');
        }
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
    
    this.seleccionarTropaShooter = function(tropaId) {
        const tropa = this.unidadesAtaque.tierra.tropas.find(t => t.id === tropaId);
        if (!tropa || (!tropa.desbloqueado && !this.datosJugador.tropasDesbloqueadas?.[tropaId])) {
            this.mostrarMensaje('🔒 Debes desbloquear este soldado primero');
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
                    <span class="arsenal-stats">❤️${tropa.stats.vida} | ⚡${tropa.stats.velocidad} | 🦘${tropa.stats.salto || 0}</span>
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
                                <span>📏${arma.alcance}px</span>
                                <span>⏱️${arma.cadencia}ms</span>
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
    
    this.seleccionarMapaShooter = function(mapaId) {
        const mapa = this.mapasShooter.tierra.find(m => m.id === mapaId);
        if (!mapa) return;
        
        const desbloqueado = mapa.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(mapaId);
        
        if (!desbloqueado) {
            // Mostrar opción de compra
            this.mostrarComprarMapa(mapa);
            return;
        }
        
        // Actualizar UI
        $('.mapa-card').removeClass('seleccionado');
        $(`.mapa-card[data-mapa="${mapaId}"]`).addClass('seleccionado');
        
        this.shooterSeleccion.mapa = mapaId;
        this.actualizarEstadoIniciar();
    }
    
    this.mostrarComprarMapa = function(mapa) {
        const html = `
            <div style="text-align: center; padding: 20px;">
                <h2>${mapa.emoji} ${mapa.nombre}</h2>
                <div class="rareza-badge rareza-${mapa.rareza.toLowerCase()}">${mapa.rareza}</div>
                <p style="color: #aaa; margin: 15px 0;">${mapa.descripcion}</p>
                <div style="font-size: 1.5rem; margin: 20px 0;">
                    ${mapa.precio > 0 ? `<span>💰 ${mapa.precio.toLocaleString()}</span>` : ''}
                    ${mapa.precioDiamantes ? `<span style="margin-left: 15px;">💎 ${mapa.precioDiamantes}</span>` : ''}
                </div>
                <button class="btn btn-success btn-lg" onclick="cw.comprarMapa('${mapa.id}')">
                    🔓 DESBLOQUEAR MAPA
                </button>
                <button class="btn btn-secondary mt-2" onclick="$('#miModal').modal('hide');">Cancelar</button>
            </div>
        `;
        this.mostrarModal(html);
    }
    
    this.comprarMapa = function(mapaId) {
        const mapa = this.mapasShooter.tierra.find(m => m.id === mapaId);
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
        this.mostrarPanelShooterTierra();
    }
    
    this.desbloquearTropaShooter = function(tropaId) {
        const tropa = this.unidadesAtaque.tierra.tropas.find(t => t.id === tropaId);
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
        
        this.mostrarMensaje(`🪖 ¡${tropa.nombre} desbloqueado!`);
        this.mostrarPanelShooterTierra();
    }
    
    this.actualizarEstadoIniciar = function() {
        const tieneAmbos = this.shooterSeleccion.tropa && this.shooterSeleccion.mapa;
        $('#btnIniciarShooter').prop('disabled', !tieneAmbos);
        
        if (tieneAmbos) {
            const tropa = this.unidadesAtaque.tierra.tropas.find(t => t.id === this.shooterSeleccion.tropa);
            const mapa = this.mapasShooter.tierra.find(m => m.id === this.shooterSeleccion.mapa);
            $('#seleccionStatus').html(`
                <span style="color: #4CAF50;">✅ ${tropa.emoji} ${tropa.nombre} vs IA en ${mapa.emoji} ${mapa.nombre}</span>
            `);
        } else {
            let msg = [];
            if (!this.shooterSeleccion.tropa) msg.push('soldado');
            if (!this.shooterSeleccion.mapa) msg.push('mapa');
            $('#seleccionStatus').html(`Selecciona: ${msg.join(' y ')}`);
        }
    }

    this.iniciarPartidaVsIA = function(dominio, dificultad) {
        this.mostrarMensaje(`🎮 Iniciando partida contra IA...`);
        this.iniciarJuego2D(dominio, 'ia', dificultad);
    }

    // ==========================================
    // MOTOR DEL SHOOTER 1v1
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
            fase: 'apuntar', // 'apuntar', 'disparando', 'esperando', 'cambioTurno'
            turnoNumero: 1,
            tiempoTurno: 30000, // 30 segundos por turno
            inicioTurno: Date.now(),
            
            // Controles de disparo
            angulo: 45, // Ángulo en grados (0-90)
            potencia: 50, // Potencia del disparo (10-100)
            anguloMin: 5,
            anguloMax: 85,
            potenciaMin: 10,
            potenciaMax: 100,
            
            // Viento (afecta trayectoria)
            viento: (Math.random() - 0.5) * 4, // -2 a +2
            
            // Jugador
            jugador: {
                tropa: tropa,
                x: mapa.config.spawnPoints[0].x,
                y: mapa.config.spawnPoints[0].y - 60, // Ajustar para que esté sobre el suelo
                vida: tropa.stats.vida,
                vidaMax: tropa.stats.vida,
                direccion: 1, // Siempre mira a la derecha
                armaActual: 0,
                escudo: 0, // Escudo temporal
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
                y: mapa.config.spawnPoints[1].y - 60,
                vida: 100,
                vidaMax: 100,
                direccion: -1, // Siempre mira a la izquierda
                armaActual: 0,
                escudo: 0,
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
        
        // Crear la interfaz del juego
        this.crearInterfazShooter();
        
        // Iniciar los controles
        this.iniciarControlesShooter();
        
        // Iniciar el game loop
        this.gameLoopShooter();
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
                    <canvas id="shooterCanvas" width="${mapa.config.ancho || 1200}" height="${mapa.config.alto || 600}"></canvas>
                </div>
                
                <!-- Panel de Control Inferior - Solo visible en tu turno -->
                <div class="tank-controls-panel" id="controlsPanel">
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
                        <div class="turn-timer">
                            <span id="turnTimer">30</span>s
                        </div>
                    </div>
                </div>
                
                <!-- Indicador de controles -->
                <div class="tank-controls-hints">
                    <div class="tank-hint"><span class="key">↑↓</span> <span class="action">Ángulo</span></div>
                    <div class="tank-hint"><span class="key">←→</span> <span class="action">Potencia</span></div>
                    <div class="tank-hint"><span class="key">ESPACIO</span> <span class="action">Disparar</span></div>
                    <div class="tank-hint"><span class="key">1-9</span> <span class="action">Cambiar arma</span></div>
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
            
            // Solo permitir controles si es turno del jugador y está en fase de apuntar
            if (game.turno === 'jugador' && game.fase === 'apuntar') {
                // Ajustar ángulo con flechas
                if (key === 'arrowup' || key === 'w') {
                    this.ajustarAngulo(2);
                    e.preventDefault();
                }
                if (key === 'arrowdown' || key === 's') {
                    this.ajustarAngulo(-2);
                    e.preventDefault();
                }
                
                // Ajustar potencia con flechas izq/der
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
    
    // ========== SISTEMA DE DISPARO POR TURNOS ==========
    this.dispararTurno = function() {
        const game = this.shooterGame;
        if (game.turno !== 'jugador' || game.fase !== 'apuntar') return;
        
        game.fase = 'disparando';
        $('#fireBtn').prop('disabled', true).addClass('disabled');
        $('#controlsPanel').addClass('firing');
        
        const jugador = game.jugador;
        const arma = jugador.tropa.armas[jugador.armaActual];
        
        // Convertir ángulo a radianes (el jugador dispara hacia la derecha)
        const anguloRad = (game.angulo * Math.PI) / 180;
        const velocidadBase = game.potencia * 0.15; // Escalar potencia a velocidad
        
        // Calcular posición inicial del proyectil (desde la punta del cañón)
        const cañonLargo = 50;
        const startX = jugador.x + Math.cos(-anguloRad) * cañonLargo;
        const startY = jugador.y - 50 + Math.sin(-anguloRad) * cañonLargo;
        
        // Crear proyectil con física parabólica
        game.proyectilActivo = {
            x: startX,
            y: startY,
            vx: Math.cos(-anguloRad) * velocidadBase,
            vy: Math.sin(-anguloRad) * velocidadBase,
            gravedad: 0.15,
            viento: game.viento * 0.02,
            daño: arma.daño,
            radio: arma.radioExplosion || 40,
            color: '#FFD700',
            trail: [],
            propietario: 'jugador',
            arma: arma
        };
        
        jugador.stats.disparos++;
        
        console.log(`🎯 Disparo! Ángulo: ${game.angulo}°, Potencia: ${game.potencia}%`);
    }
    
    this.dispararIA = function() {
        const game = this.shooterGame;
        const enemigo = game.enemigo;
        const jugador = game.jugador;
        const arma = enemigo.tropa.armas[enemigo.armaActual];
        
        // Calcular ángulo y potencia óptimos con algo de error
        const dx = jugador.x - enemigo.x;
        const dy = jugador.y - enemigo.y;
        const distancia = Math.sqrt(dx * dx + dy * dy);
        
        // Fórmula simplificada para calcular ángulo óptimo
        // Considerando gravedad y distancia
        let anguloOptimo = Math.atan2(-dy, Math.abs(dx)) * (180 / Math.PI);
        anguloOptimo = Math.max(20, Math.min(70, anguloOptimo + 30)); // Ajustar para trayectoria parabólica
        
        // Potencia basada en distancia
        let potenciaOptima = Math.min(95, Math.max(40, distancia * 0.12));
        
        // Añadir error de la IA (más error = más fácil)
        const errorAngulo = (Math.random() - 0.5) * 20; // ±10 grados de error
        const errorPotencia = (Math.random() - 0.5) * 20; // ±10% de error
        
        enemigo.iaAngulo = Math.max(15, Math.min(80, anguloOptimo + errorAngulo));
        enemigo.iaPotencia = Math.max(30, Math.min(95, potenciaOptima + errorPotencia));
        
        // Guardar ángulo para mostrar en el cañón
        game.anguloEnemigo = enemigo.iaAngulo;
        
        // Convertir a radianes
        const anguloRad = (enemigo.iaAngulo * Math.PI) / 180;
        const velocidadBase = enemigo.iaPotencia * 0.15;
        
        // Calcular posición inicial desde la punta del cañón (enemigo dispara hacia la izquierda)
        const cañonLargo = 50;
        const startX = enemigo.x + Math.cos(Math.PI + anguloRad) * cañonLargo;
        const startY = enemigo.y - 50 + Math.sin(Math.PI + anguloRad) * cañonLargo;
        
        game.proyectilActivo = {
            x: startX,
            y: startY,
            vx: Math.cos(Math.PI + anguloRad) * velocidadBase,
            vy: Math.sin(Math.PI + anguloRad) * velocidadBase,
            gravedad: 0.15,
            viento: game.viento * 0.02,
            daño: arma.daño,
            radio: arma.radioExplosion || 40,
            color: '#FF4444',
            trail: [],
            propietario: 'enemigo',
            arma: arma
        };
        
        console.log(`🤖 IA dispara! Ángulo: ${enemigo.iaAngulo.toFixed(1)}°, Potencia: ${enemigo.iaPotencia.toFixed(1)}%`);
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
            $(`#tankWeapons .tank-weapon-btn[data-arma="${idx}"]`).addClass('active');
            
            console.log(`🔫 Arma cambiada a: ${arma.nombre}`);
        }
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
            const daño = proyectil.daño;
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
    
    this.cambiarTurno = function() {
        const game = this.shooterGame;
        
        // Cambiar turno
        game.turno = game.turno === 'jugador' ? 'enemigo' : 'jugador';
        game.turnoNumero++;
        game.fase = 'apuntar';
        game.inicioTurno = Date.now();
        game.iaEsperando = false;
        
        // Cambiar viento ligeramente cada turno
        game.viento += (Math.random() - 0.5) * 1;
        game.viento = Math.max(-3, Math.min(3, game.viento));
        this.actualizarViento();
        
        // Actualizar UI
        if (game.turno === 'jugador') {
            $('#turnIndicator').removeClass('enemy').html('<span class="turn-text">🎯 TU TURNO</span>');
            $('#controlsPanel').removeClass('disabled firing').show();
            $('#fireBtn').prop('disabled', false).removeClass('disabled');
            $('#turnTimer').removeClass('warning').text('30');
        } else {
            $('#turnIndicator').addClass('enemy').html('<span class="turn-text">⏳ TURNO ENEMIGO</span>');
            $('#controlsPanel').addClass('disabled');
        }
        
        $('#roundNumber').text(Math.ceil(game.turnoNumero / 2));
        
        console.log(`🔄 Turno ${game.turnoNumero}: ${game.turno}`);
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
    // 🎮 RENDERIZADO TANK STARS - ESTILO JUEGO POR TURNOS
    // ============================================================
    this.renderizarTankStars = function() {
        const game = this.shooterGame;
        const ctx = game.ctx;
        
        if (!ctx) return;
        
        const W = game.canvas.width;
        const H = game.canvas.height;
        const suelo = H - 50;
        
        // ========== CIELO ÉPICO CON GRADIENTE ==========
        const skyGradient = ctx.createLinearGradient(0, 0, 0, H);
        skyGradient.addColorStop(0, '#0f1123');
        skyGradient.addColorStop(0.2, '#1a2a4a');
        skyGradient.addColorStop(0.4, '#2d4a6f');
        skyGradient.addColorStop(0.7, '#4a7494');
        skyGradient.addColorStop(1, '#87CEEB');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, W, H);
        
        // Estrellas brillantes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const starX = (i * 127 + 50) % W;
            const starY = (i * 83 + 20) % (H * 0.35);
            const twinkle = Math.sin(Date.now() * 0.003 + i) * 0.5 + 0.5;
            ctx.globalAlpha = twinkle * 0.8;
            ctx.beginPath();
            ctx.arc(starX, starY, 1 + Math.random() * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Luna
        const lunaX = W - 100;
        const lunaY = 80;
        const lunaGradient = ctx.createRadialGradient(lunaX - 5, lunaY - 5, 5, lunaX, lunaY, 35);
        lunaGradient.addColorStop(0, '#FFFDE7');
        lunaGradient.addColorStop(0.5, '#FFF9C4');
        lunaGradient.addColorStop(1, 'rgba(255,249,196,0.1)');
        ctx.fillStyle = lunaGradient;
        ctx.beginPath();
        ctx.arc(lunaX, lunaY, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // ========== MONTAÑAS DE FONDO ==========
        // Montañas lejanas
        ctx.fillStyle = '#1e3d59';
        ctx.beginPath();
        ctx.moveTo(0, suelo);
        for (let x = 0; x <= W; x += 30) {
            const peakHeight = Math.sin(x * 0.008) * 100 + Math.sin(x * 0.015) * 60 + 120;
            ctx.lineTo(x, suelo - peakHeight);
        }
        ctx.lineTo(W, suelo);
        ctx.closePath();
        ctx.fill();
        
        // Montañas cercanas
        ctx.fillStyle = '#2d5a4a';
        ctx.beginPath();
        ctx.moveTo(0, suelo);
        for (let x = 0; x <= W; x += 25) {
            const peakHeight = Math.sin(x * 0.012 + 1) * 70 + Math.sin(x * 0.025) * 40 + 80;
            ctx.lineTo(x, suelo - peakHeight);
        }
        ctx.lineTo(W, suelo);
        ctx.closePath();
        ctx.fill();
        
        // ========== TERRENO / SUELO CON TEXTURA ==========
        // Base del terreno
        const groundGradient = ctx.createLinearGradient(0, suelo, 0, H);
        groundGradient.addColorStop(0, '#4a3f35');
        groundGradient.addColorStop(0.4, '#3d3530');
        groundGradient.addColorStop(1, '#2a2520');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, suelo, W, H - suelo);
        
        // Capa de hierba
        ctx.fillStyle = '#3d6b35';
        ctx.fillRect(0, suelo, W, 8);
        
        // Hierba animada
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        for (let x = 0; x < W; x += 12) {
            const grassHeight = 10 + Math.sin(x * 0.1 + Date.now() * 0.002) * 4;
            const windOffset = Math.sin(Date.now() * 0.002 + x * 0.05) * 3 * (game.viento || 0);
            ctx.beginPath();
            ctx.moveTo(x, suelo);
            ctx.quadraticCurveTo(x + windOffset, suelo - grassHeight / 2, x + windOffset * 1.5, suelo - grassHeight);
            ctx.stroke();
        }
        
        // ========== INDICADOR DE VIENTO VISUAL ==========
        if (game.viento !== 0) {
            const windDir = game.viento > 0 ? 1 : -1;
            const windStrength = Math.abs(game.viento);
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 2;
            for (let i = 0; i < windStrength * 3; i++) {
                const wx = (Date.now() * 0.1 * windDir + i * 150) % (W + 200) - 100;
                const wy = 100 + i * 40;
                ctx.beginPath();
                ctx.moveTo(wx, wy);
                ctx.lineTo(wx + windDir * 30, wy);
                ctx.lineTo(wx + windDir * 25, wy - 5);
                ctx.moveTo(wx + windDir * 30, wy);
                ctx.lineTo(wx + windDir * 25, wy + 5);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
        
        // ========== DIBUJAR TANQUES ==========
        this.dibujarTanqueTankStars(ctx, game.jugador, '#4CAF50', true, game.turno === 'jugador' && game.fase === 'apuntar');
        this.dibujarTanqueTankStars(ctx, game.enemigo, '#f44336', false, game.turno === 'enemigo' && game.fase === 'apuntar');
        
        // ========== TRAYECTORIA PREVIEW (Solo en turno del jugador) ==========
        if (game.turno === 'jugador' && game.fase === 'apuntar') {
            this.dibujarTrayectoriaPreview(ctx, game.jugador, game.angulo, game.potencia, game.viento);
        }
        
        // ========== PROYECTILES EN VUELO ==========
        const proyectiles = game.proyectilActivo ? [game.proyectilActivo] : [];
        for (const p of proyectiles) {
            // Trail del proyectil
            if (p.trail && p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                const trailGradient = ctx.createLinearGradient(
                    p.trail[0].x, p.trail[0].y,
                    p.trail[p.trail.length - 1].x, p.trail[p.trail.length - 1].y
                );
                trailGradient.addColorStop(0, 'rgba(255, 150, 50, 0)');
                trailGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.3)');
                trailGradient.addColorStop(1, 'rgba(255, 100, 0, 0.8)');
                ctx.strokeStyle = trailGradient;
                ctx.lineWidth = 4;
                ctx.stroke();
            }
            
            // Proyectil principal
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.3, '#FFD54F');
            gradient.addColorStop(0.6, '#FF9800');
            gradient.addColorStop(1, '#F44336');
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Brillo
            ctx.beginPath();
            ctx.arc(p.x - 3, p.y - 3, 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
            
            // Aura de fuego
            ctx.beginPath();
            ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // ========== EFECTOS (Explosiones, etc) ==========
        const ahora = Date.now();
        game.efectos = game.efectos.filter(e => ahora - e.inicio < e.duracion);
        
        for (const e of game.efectos) {
            const progress = (ahora - e.inicio) / e.duracion;
            const alpha = 1 - progress;
            
            if (e.tipo === 'explosion') {
                // Círculos de explosión
                for (let r = 0; r < 4; r++) {
                    const radius = 20 + progress * 60 + r * 15;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
                    const hue = 30 + r * 10;
                    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha * 0.8})`;
                    ctx.lineWidth = 5 - r;
                    ctx.stroke();
                }
                
                // Partículas de explosión
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const dist = progress * 70;
                    const px = e.x + Math.cos(angle) * dist;
                    const py = e.y + Math.sin(angle) * dist + progress * 20;
                    ctx.beginPath();
                    ctx.arc(px, py, 5 * (1 - progress), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, ${100 + i * 10}, 0, ${alpha})`;
                    ctx.fill();
                }
                
                // Flash central
                if (progress < 0.3) {
                    const flashRadius = (1 - progress / 0.3) * 40;
                    ctx.beginPath();
                    ctx.arc(e.x, e.y, flashRadius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 200, ${(1 - progress / 0.3) * 0.8})`;
                    ctx.fill();
                }
            } else if (e.tipo === 'daño') {
                // Número de daño flotante
                ctx.font = `bold ${40 - progress * 15}px Impact`;
                ctx.textAlign = 'center';
                ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
                ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.lineWidth = 3;
                ctx.strokeText(`-${e.cantidad}`, e.x, e.y - progress * 50);
                ctx.fillText(`-${e.cantidad}`, e.x, e.y - progress * 50);
            }
        }
        
        // ========== MENSAJE DE TURNO ==========
        if (game.mensajeTurno && Date.now() - game.mensajeTurnoInicio < 2000) {
            const progress = (Date.now() - game.mensajeTurnoInicio) / 2000;
            ctx.globalAlpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
            ctx.font = 'bold 60px Impact';
            ctx.textAlign = 'center';
            ctx.fillStyle = game.turno === 'jugador' ? '#4CAF50' : '#f44336';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeText(game.mensajeTurno, W / 2, H / 2);
            ctx.fillText(game.mensajeTurno, W / 2, H / 2);
            ctx.globalAlpha = 1;
        }
    }
    
    // ============================================================
    // DIBUJAR TANQUE ESTILO TANK STARS
    // ============================================================
    this.dibujarTanqueTankStars = function(ctx, entidad, colorBase, esJugador, esActivo) {
        if (!entidad || !entidad.tropa) return;
        
        const x = entidad.x;
        const y = entidad.y;
        const dir = esJugador ? 1 : -1;
        const game = this.shooterGame;
        
        // ========== SOMBRA DEL TANQUE ==========
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 45, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // ========== ORUGAS / RUEDAS ==========
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.roundRect(x - 40, y - 12, 80, 24, 12);
        ctx.fill();
        
        // Detalle de las orugas
        ctx.fillStyle = '#2d2d2d';
        for (let i = -35; i < 40; i += 12) {
            ctx.fillRect(x + i, y - 10, 8, 20);
        }
        
        // Ruedas
        ctx.fillStyle = '#333';
        for (let i = -30; i <= 30; i += 20) {
            ctx.beginPath();
            ctx.arc(x + i, y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // ========== CUERPO PRINCIPAL DEL TANQUE ==========
        const bodyGradient = ctx.createLinearGradient(x - 35, y - 45, x + 35, y - 15);
        bodyGradient.addColorStop(0, this.ajustarBrillo(colorBase, 1.3));
        bodyGradient.addColorStop(0.5, colorBase);
        bodyGradient.addColorStop(1, this.ajustarBrillo(colorBase, 0.7));
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.moveTo(x - 35, y - 12);
        ctx.lineTo(x - 40, y - 35);
        ctx.lineTo(x - 20, y - 45);
        ctx.lineTo(x + 20, y - 45);
        ctx.lineTo(x + 40, y - 35);
        ctx.lineTo(x + 35, y - 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = this.ajustarBrillo(colorBase, 0.5);
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Detalle del cuerpo
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x - 25, y - 40, 50, 5);
        
        // ========== TORRETA ==========
        const torretaGradient = ctx.createLinearGradient(x - 20, y - 70, x + 20, y - 45);
        torretaGradient.addColorStop(0, this.ajustarBrillo(colorBase, 1.2));
        torretaGradient.addColorStop(1, this.ajustarBrillo(colorBase, 0.8));
        
        ctx.fillStyle = torretaGradient;
        ctx.beginPath();
        ctx.arc(x, y - 50, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = this.ajustarBrillo(colorBase, 0.5);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // ========== CAÑÓN ==========
        // Calcular ángulo del cañón
        let anguloCañon;
        if (esJugador && game.fase === 'apuntar') {
            anguloCañon = -game.angulo * (Math.PI / 180);
        } else if (!esJugador && game.turno === 'enemigo') {
            anguloCañon = Math.PI + (game.anguloEnemigo || 45) * (Math.PI / 180);
        } else {
            anguloCañon = esJugador ? -Math.PI/4 : Math.PI + Math.PI/4;
        }
        
        const cañonLargo = 50;
        const cañonEndX = x + Math.cos(anguloCañon) * cañonLargo;
        const cañonEndY = y - 50 + Math.sin(anguloCañon) * cañonLargo;
        
        // Cañón con gradiente
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - 50);
        ctx.lineTo(cañonEndX, cañonEndY);
        ctx.stroke();
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x, y - 50);
        ctx.lineTo(cañonEndX, cañonEndY);
        ctx.stroke();
        
        // Brillo del cañón
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x + 5, y - 52);
        ctx.lineTo(cañonEndX, cañonEndY - 2);
        ctx.stroke();
        
        // Boca del cañón
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(cañonEndX, cañonEndY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // ========== INDICADOR DE TURNO ACTIVO ==========
        if (esActivo) {
            // Aura brillante
            ctx.beginPath();
            ctx.arc(x, y - 40, 55, 0, Math.PI * 2);
            const auraGradient = ctx.createRadialGradient(x, y - 40, 25, x, y - 40, 55);
            auraGradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
            auraGradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.3)');
            auraGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = auraGradient;
            ctx.fill();
            
            // Flecha indicadora
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            const arrowY = y - 100 + Math.sin(Date.now() * 0.005) * 8;
            ctx.moveTo(x, arrowY);
            ctx.lineTo(x - 12, arrowY - 18);
            ctx.lineTo(x + 12, arrowY - 18);
            ctx.closePath();
            ctx.fill();
        }
        
        // ========== EMOJI DE TROPA ==========
        ctx.font = 'bold 35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(entidad.tropa.emoji, x, y - 120);
        ctx.shadowBlur = 0;
        
        // ========== BARRA DE VIDA TANK STARS ==========
        const barraAncho = 80;
        const barraAlto = 12;
        const barraX = x - barraAncho / 2;
        const barraY = y - 145;
        const vidaPct = entidad.vida / entidad.vidaMax;
        
        // Fondo de la barra
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(barraX - 3, barraY - 3, barraAncho + 6, barraAlto + 6, 8);
        ctx.fill();
        
        // Barra interior
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.roundRect(barraX, barraY, barraAncho, barraAlto, 6);
        ctx.fill();
        
        // Vida actual
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
        ctx.roundRect(barraX, barraY, barraAncho * vidaPct, barraAlto, 6);
        ctx.fill();
        
        // Brillo
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.roundRect(barraX, barraY, barraAncho * vidaPct, barraAlto / 2, [6, 6, 0, 0]);
        ctx.fill();
        
        // Texto de vida
        ctx.font = 'bold 11px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(entidad.vida)} HP`, x, barraY + barraAlto + 14);
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
        
        // Recompensas
        let monedas = resultado === 'victoria' ? 500 : 100;
        let exp = resultado === 'victoria' ? 200 : 50;
        
        // Bonus por precisión
        if (precision > 70) {
            monedas += 200;
            exp += 100;
        }
        
        this.datosJugador.monedas += monedas;
        this.datosJugador.experiencia += exp;
        this.actualizarMonedas();
        this.guardarProgreso();
        
        const htmlFin = `
            <div class="shooter-end-screen">
                <div class="end-result ${resultado}">${resultado === 'victoria' ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}</div>
                
                <div class="end-stats">
                    <div class="stat-box">
                        <div class="stat-value">${stats.dañoHecho}</div>
                        <div class="stat-label">Daño Infligido</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${precision}%</div>
                        <div class="stat-label">Precisión</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.disparos}</div>
                        <div class="stat-label">Disparos</div>
                    </div>
                </div>
                
                <div style="margin: 20px 0; font-size: 1.3rem;">
                    <span style="color: #FFD700;">+${monedas} 💰</span>
                    <span style="margin-left: 20px; color: #4FC3F7;">+${exp} ⭐</span>
                </div>
                
                <div class="end-buttons">
                    <button class="btn-end btn-rematch" onclick="cw.revancharShooter()">🔄 Revancha</button>
                    <button class="btn-end btn-menu" onclick="cw.salirShooter()">🏠 Menú</button>
                </div>
            </div>
        `;
        
        $('#canvasContainer').append(htmlFin);
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
        const esShooter = dominio === 'tierra' && data.tipoJuego === 'shooter';
        
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
        
        const panel = `
            <div class="game-panel ${temaClases[dominio]}">
                <div class="panel-header">
                    <h2 class="panel-title">${data.emoji} Multijugador ${esShooter ? '1v1' : ''} - ${data.nombre}</h2>
                    <button class="btn-back" id="btnVolverDominio">← Volver</button>
                </div>
                
                <div class="matches-section">
                    <div class="match-actions">
                        <button class="btn-create-match" id="btnCrearPartida">⚔️ Crear Partida</button>
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
        
        this.dominioMultijugador = dominio;
        
        $("#btnVolverDominio").on("click", () => cw.mostrarMenuDominio(dominio));
        
        $("#btnCrearPartida").on("click", function() {
            let nick = $.cookie("nick");
            if (nick && ws) {
                // Para shooter, mostrar selección de mapa primero
                if (esShooter) {
                    cw.mostrarSeleccionMapaMulti();
                } else {
                    ws.crearPartida();
                }
            } else {
                cw.mostrarModal("Debes iniciar sesión.");
            }
        });
        
        $("#btnUnirPartida").on("click", function() {
            let codigo = $("#codigoPartida").val();
            if (codigo && ws) {
                ws.unirAPartida(codigo);
            } else {
                cw.mostrarModal("Introduce un código válido.");
            }
        });
        
        if (ws && ws.socket) {
            ws.socket.emit("obtenerPartidas");
        }
    }
    
    // ==========================================
    // MULTIJUGADOR SHOOTER - SELECCIÓN DE MAPA (CREADOR)
    // ==========================================
    
    this.mostrarSeleccionMapaMulti = function() {
        this.limpiar();
        const mapas = this.mapasShooter.tierra || [];
        
        // Solo mostrar mapas desbloqueados
        const mapasDisponibles = mapas.filter(m => 
            m.desbloqueado || this.datosJugador.mapasDesbloqueados?.includes(m.id)
        );
        
        const html = `
            <div class="game-panel domain-theme-land">
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
                             data-mapa="${mapa.id}" onclick="cw.seleccionarMapaMulti('${mapa.id}')">
                            <div class="mapa-emoji">${mapa.emoji}</div>
                            <div class="mapa-nombre">${mapa.nombre}</div>
                            <div class="mapa-rareza">${mapa.rareza}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="multi-actions" style="text-align: center; margin-top: 30px;">
                    <button class="btn-iniciar-combate" id="btnConfirmarMapa" disabled>
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
        
        $("#btnVolverMulti").on("click", function() {
            cw.mostrarPanelMultijugadorDominio('tierra');
        });
        
        $("#btnConfirmarMapa").on("click", function() {
            console.log("Click en confirmar mapa, seleccionado:", cw.mapaMultiSeleccionado);
            if (cw.mapaMultiSeleccionado && ws) {
                console.log("Creando partida shooter con mapa:", cw.mapaMultiSeleccionado);
                ws.crearPartidaShooter(cw.mapaMultiSeleccionado);
            } else {
                console.log("No se puede crear: mapa=", cw.mapaMultiSeleccionado, "ws=", ws);
                if (!ws) {
                    cw.mostrarModal("Error de conexión. Recarga la página.");
                }
            }
        });
    }
    
    this.seleccionarMapaMulti = function(mapaId) {
        const mapa = this.mapasShooter.tierra.find(m => m.id === mapaId);
        if (!mapa) return;
        
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
    
    this.mostrarEsperandoRivalShooter = function(mapaId) {
        this.limpiar();
        const mapa = this.mapasShooter.tierra.find(m => m.id === mapaId);
        
        const waiting = `
            <div class="game-panel domain-theme-land">
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
            tropaSeleccionada: null
        };
        
        $("#btnCancelarPartida").on("click", function() {
            ws.salirPartida();
            cw.mostrarPanelMultijugadorDominio('tierra');
        });
    }

    // ==========================================
    // PANTALLA DE SELECCIÓN DE PERSONAJE (AMBOS JUGADORES)
    // ==========================================
    
    this.mostrarSeleccionPersonajeMulti = function(mapaId, esHost, rivalNick) {
        this.limpiar();
        
        const mapa = this.mapasShooter.tierra.find(m => m.id === mapaId);
        const tropas = this.unidadesAtaque.tierra.tropas || [];
        
        // Tropas disponibles (desbloqueadas)
        const tropasDisponibles = tropas.filter(t => 
            t.desbloqueado || this.datosJugador.tropasDesbloqueadas?.[t.id]
        );
        
        const html = `
            <div class="game-panel domain-theme-land">
                <div class="panel-header">
                    <h2 class="panel-title">🪖 Elige tu Soldado</h2>
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
                             data-tropa="${tropa.id}" onclick="cw.seleccionarTropaMulti('${tropa.id}')">
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
                        ⚠️ No tienes soldados desbloqueados. Compra uno en la tienda.
                    </p>
                ` : ''}
                
                <div class="multi-actions" style="text-align: center; margin-top: 30px;">
                    <button class="btn-iniciar-combate" id="btnConfirmarTropa" disabled>
                        ⚔️ ¡LISTO PARA EL COMBATE!
                    </button>
                    <p id="tropaSeleccionadaInfo" style="color: #888; margin-top: 10px;">
                        Selecciona tu soldado
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
            miListo: false
        };
        
        $("#btnConfirmarTropa").on("click", () => {
            if (this.partidaShooterData.tropaSeleccionada) {
                this.confirmarTropaMulti();
            }
        });
    }
    
    this.seleccionarTropaMulti = function(tropaId) {
        const tropa = this.unidadesAtaque.tierra.tropas.find(t => t.id === tropaId);
        if (!tropa) return;
        
        $('.tropa-select-card').removeClass('seleccionado');
        $(`.tropa-select-card[data-tropa="${tropaId}"]`).addClass('seleccionado');
        
        this.partidaShooterData.tropaSeleccionada = tropaId;
        
        $('#btnConfirmarTropa').prop('disabled', false);
        $('#tropaSeleccionadaInfo').html(`<span style="color: #4CAF50;">✅ ${tropa.emoji} ${tropa.nombre}</span>`);
    }
    
    this.confirmarTropaMulti = function() {
        const data = this.partidaShooterData;
        if (!data || !data.tropaSeleccionada) return;
        
        data.miListo = true;
        $('#btnConfirmarTropa').prop('disabled', true).text('✅ ¡LISTO!');
        
        // Notificar al servidor
        if (ws && ws.socket) {
            ws.socket.emit('jugadorListoShooter', {
                tropaId: data.tropaSeleccionada,
                codigo: ws.codigo
            });
        }
        
        // Si ambos están listos, iniciar el juego
        this.verificarInicioShooterMulti();
    }
    
    this.rivalListoShooter = function(tropaId) {
        if (!this.partidaShooterData) return;
        
        this.partidaShooterData.rivalListo = true;
        this.partidaShooterData.rivalTropa = tropaId;
        
        $('#estadoRival').html('<span style="color: #4CAF50;">✅ ¡Rival listo!</span>');
        
        this.verificarInicioShooterMulti();
    }
    
    this.verificarInicioShooterMulti = function() {
        const data = this.partidaShooterData;
        if (!data) return;
        
        if (data.miListo && data.rivalListo) {
            // Ambos listos, iniciar partida!
            setTimeout(() => {
                this.iniciarShooterMultijugador(data);
            }, 1000);
        }
    }
    
    this.iniciarShooterMultijugador = function(data) {
        // Iniciar el juego shooter en modo multijugador
        this.iniciarJuegoShooter('tierra', data.tropaSeleccionada, data.mapaId, 'multi');
        
        // Configurar datos del rival con su tropa real
        if (this.shooterGame && data.rivalTropa) {
            const tropasDisponibles = this.unidadesAtaque.tierra.tropas;
            const tropaRival = tropasDisponibles.find(t => t.id === data.rivalTropa);
            
            if (tropaRival) {
                this.shooterGame.enemigo.tropa = tropaRival;
                this.shooterGame.enemigo.vida = tropaRival.stats.vida;
                this.shooterGame.enemigo.vidaMax = tropaRival.stats.vida;
            }
            
            this.shooterGame.rivalNick = data.rivalNick;
            this.shooterGame.esHost = data.esHost;
            
            // Actualizar HUD con el nombre del rival
            $('.hud-player.enemy .hud-name').text(`${this.shooterGame.enemigo.tropa.emoji} ${data.rivalNick || this.shooterGame.enemigo.tropa.nombre}`);
        }
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
    
    // Finalizar partida multijugador
    this.finPartidaMulti = function(victoria) {
        const dominio = this.juegoActual.dominio;
        
        // Actualizar estadísticas
        this.datosJugador.partidasJugadas++;
        if (victoria) {
            this.datosJugador.victorias++;
            this.datosJugador.copas += 30;
            this.datosJugador.monedas += 200;
            this.datosJugador.xp += 50;
        } else {
            this.datosJugador.derrotas++;
            this.datosJugador.copas = Math.max(0, this.datosJugador.copas - 10);
            this.datosJugador.monedas += 50;
            this.datosJugador.xp += 20;
        }
        
        // Verificar subida de nivel
        this.verificarSubidaNivel();
        
        // Actualizar rango basado en copas
        this.actualizarRangoPorCopas();
        
        this.actualizarMonedas();
        this.actualizarPerfilStats();
        
        // Mostrar resultado
        this.mostrarModal(`
            <div style="text-align: center;">
                <h2 style="color: ${victoria ? '#28a745' : '#dc3545'};">${victoria ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}</h2>
                <div style="margin: 20px 0;">
                    <p>Copas: ${victoria ? '+30 🏆' : '-10 🏆'}</p>
                    <p>Oro: +${victoria ? '200' : '50'} 💰</p>
                    <p>XP: +${victoria ? '50' : '20'} ⭐</p>
                </div>
                <button class="btn btn-primary mt-3" onclick="$('#miModal').modal('hide'); cw.mostrarMenuDominio('${dominio}');">
                    Continuar
                </button>
            </div>
        `);
    }
    
    // Verificar subida de nivel
    this.verificarSubidaNivel = function() {
        const xpNecesario = this.datosJugador.nivel * 100;
        while (this.datosJugador.xp >= xpNecesario) {
            this.datosJugador.xp -= xpNecesario;
            this.datosJugador.nivel++;
            
            // Recompensas por nivel
            this.datosJugador.monedas += this.datosJugador.nivel * 50;
            if (this.datosJugador.nivel % 5 === 0) {
                this.datosJugador.diamantes += this.datosJugador.nivel * 2;
            }
            
            this.mostrarMensaje(`🎉 ¡Subiste al nivel ${this.datosJugador.nivel}!`);
        }
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
    // Legacy functions
    this.mostrarPanelUnJugador = function() { this.mostrarMenuPrincipal(); }
    this.mostrarPanelMultijugador = function() { this.mostrarMenuPrincipal(); }
    this.amigos = [];
    this.agregarAmigo = function(nick) { this.mostrarMensaje('Función en desarrollo'); }
    this.eliminarAmigo = function(nick) {}
    this.actualizarListaAmigos = function() {}

    window.ControlWeb = ControlWeb;
}