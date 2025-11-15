function ClienteRest() {
    
	this.agregarUsuario = function(nick) {
		var cli = this;
		$.getJSON("/agregarUsuario/" + nick, function(data) {
			let msg ="El nick " + nick + " está ocupado.";
			if (data.nick != -1) {
				console.log("Usuario " + nick + " ha sido registrado");
				msg ="Bienvenido al sistema, " + nick;
				$.cookie("nick", nick);
			} else {
				console.log("El nick ya está ocupado");
			}
			cw.mostrarMensaje(msg);
		});
	}

	this.agregarUsuario2 = function(nick) {
		$.ajax({
			type: 'GET',
			url: '/agregarUsuario/' + nick,
			success: function(data) {
				if (data.nick != -1) {
					console.log("Usuario " + nick + " ha sido registrado");
				} else {
					console.log("El nick ya está ocupado");
				}
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log("Status: " + textStatus);
				console.log("Error: " + errorThrown);
			},
			contentType: 'application/json'
		});
	}

	this.obtenerUsuarios = function() {
		$.ajax({
			type: 'GET',
			url: '/obtenerUsuarios',
			success: function(data) {
				console.log("Usuarios:", data.usuarios);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log("Status: " + textStatus);
				console.log("Error: " + errorThrown);
			},
			contentType: 'application/json'
		});
	}

	this.numeroUsuarios = function() {
		$.ajax({
			type: 'GET',
			url: '/numeroUsuarios',
			success: function(data) {
				console.log("Numero de usuarios:", data.num);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log("Status: " + textStatus);
				console.log("Error: " + errorThrown);
			},
			contentType: 'application/json'
		});
	}

	this.usuarioActivo = function(nick) {
		$.ajax({
			type: 'GET',
			url: '/usuarioActivo/' + nick,
			success: function(data) {
				console.log("Usuario activo:", data.res);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log("Status: " + textStatus);
				console.log("Error: " + errorThrown);
			},
			contentType: 'application/json'
		});
	}

	this.eliminarUsuario = function(nick) {
		$.ajax({
			type: 'GET',
			url: '/eliminarUsuario/' + nick,
			success: function(data) {
				console.log("Usuario eliminado:", data);
			},
			error: function(xhr, textStatus, errorThrown) {
				console.log("Status: " + textStatus);
				console.log("Error: " + errorThrown);
			},
			contentType: 'application/json'
		});
	}

	this.registrarUsuario=function(email,password){
		$.ajax({
			type:'POST',
			url:'/registrarUsuario',
			data: JSON.stringify({"email":email,"password":password}),
			success:function(data){
				if (data.nick!=-1){
					$("#msg").html('<div class="alert alert-success">Registro correcto. Revisa tu correo para confirmar la cuenta e inicia sesión.</div>');
					cw.mostrarLogin();
				}
				else{
					$("#msg").html('<div class="alert alert-danger">Ese email ya está registrado. Prueba con otro o inicia sesión.</div>');
				}
			},
			error:function(xhr, textStatus, errorThrown){
				console.log("Status: " + textStatus);
				console.log("Error: " + errorThrown);
			},
			contentType:'application/json'
		});
	}

	// Inicio de sesión local
	this.loginUsuario=function(email,password){
		$.ajax({
			type:'POST',
			url:'/loginUsuario',
			data: JSON.stringify({"email":email,"password":password}),
			success:function(data){
				if (data.nick!=-1){
				console.log("Usuario "+data.nick+" ha sido registrado");	
				$.cookie("nick",data.nick);
				cw.limpiar();
				cw.mostrarMensaje("Bienvenido al sistema,"+data.nick);
				//cw.mostrarLogin();
				}
				else{
					console.log("No se pudo iniciar sesión");
					cw.mostrarLogin();
					//cw.mostrarMensajeLogin("No se pudo iniciarsesión");
				}
			},
			error:function(xhr, textStatus, errorThrown){
				console.log("Status: " + textStatus);
				console.log("Error: " + errorThrown);
			},
			contentType:'application/json'
		});
	}


	this.cerrarSesion=function(){
		$.getJSON("/cerrarSesion")
			.done(function(){
				console.log("Sesión cerrada");
				$.removeCookie("nick");
				try {
					if (typeof cw !== 'undefined') {
						cw.limpiar();
						cw.mostrarRegistro();
						$('#msg').html('<div class="alert alert-success">Sesión cerrada.</div>');
					}
				} catch(_){ }
			})
			.fail(function(){
				console.log('Error cerrando sesión en servidor');
				$.removeCookie('nick');
				try { if (typeof cw !== 'undefined') { cw.limpiar(); cw.mostrarRegistro(); $('#msg').html('<div class="alert alert-danger">Error cerrando sesión en servidor.</div>'); } } catch(_){ }
			});
	}
}