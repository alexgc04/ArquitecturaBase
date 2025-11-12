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
	this.loginUsuario=function(usr){
		$.ajax({
			type:'POST',
			url:'/loginUsuario',
			data: JSON.stringify(usr),
			success:function(data){
				// Éxito solo si nick existe y no es -1
				if (data.nick && data.nick !== -1){
					$.cookie("nick",data.nick);
					cw.mostrarMensaje("Bienvenido al sistema, "+data.nick);
				} else {
					$("#msg").html('<div class="alert alert-danger">Credenciales incorrectas o cuenta no confirmada.</div>');
				}
			},
			error:function(xhr, textStatus, errorThrown){
				// Si el servidor devuelve 401, mostrar mensaje de error uniforme
				if (xhr.status===401){
					$("#msg").html('<div class="alert alert-danger">'+ (xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Error en autenticación.') +'</div>');
				} else {
					console.log("Status: " + textStatus);
					console.log("Error: " + errorThrown);
				}
			},
			contentType:'application/json'
		});
	}

	this.cerrarSesion=function(){
		$.getJSON("/cerrarSesion",function(){
			console.log("Sesión cerrada");
			$.removeCookie("nick");
		});
	}
}