function ControlWeb(){
    this.mostrarAgregarUsuario = function(){
        let cadena = '<div id="mAU" class="form-group">';
        cadena += '  <label for="nick">Name:</label>';
        cadena += '  <input type="text" class="form-control" id="nick">';
        cadena += '  <button id="btnAU" type="submit" class="btn btn-primary" style="margin-top:8px;">Submit</button>';
        cadena += '</div>';

        if (!$("#mAU").length) $("#au").append(cadena);
        $("#btnAU").on("click", function(){
            let nick = $("#nick").val();
            if (typeof rest === 'undefined'){
                window.rest = new ClienteRest();
            }
            rest.agregarUsuario(nick);
            $("#mAU").remove();
        });
    }

    // Mostrar panel con el resto de operaciones (6.3 exercises)
    this.mostrarPanelOps = function(){
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
            $.getJSON('/obtenerUsuarios', function(data){
                const keys = Object.keys(data || {});
                $("#opsResult").text('Usuarios ('+keys.length+'):\n'+keys.join('\n'));
            }).fail(function(){
                $("#opsResult").text('Error al obtener usuarios');
            });
        });

        $("#btnNumeroUsuarios").on('click', () => {
            $.getJSON('/numeroUsuarios', function(data){
                if (data && data.num !== undefined){
                    $("#opsResult").text('Número de usuarios: ' + data.num);
                } else {
                    $("#opsResult").text('Respuesta inesperada: ' + JSON.stringify(data));
                }
            }).fail(function(){
                $("#opsResult").text('Error al obtener número de usuarios');
            });
        });

        $("#btnUsuarioActivo").on('click', () => {
            const nick = $("#nickCheck").val();
            if (!nick){
                $("#opsResult").text('Introduce un nick a comprobar');
                return;
            }
            $.getJSON('/usuarioActivo/'+encodeURIComponent(nick), function(data){
                $("#opsResult").text('usuarioActivo("'+nick+'") -> ' + JSON.stringify(data));
            }).fail(function(){
                $("#opsResult").text('Error al comprobar usuario activo');
            });
        });

        $("#btnEliminarUsuario").on('click', () => {
            const nick = $("#nickEliminar").val();
            if (!nick){
                $("#opsResult").text('Introduce un nick a eliminar');
                return;
            }
            $.getJSON('/eliminarUsuario/'+encodeURIComponent(nick), function(data){
                $("#opsResult").text('eliminarUsuario("'+nick+'") -> ' + JSON.stringify(data));
            }).fail(function(){
                $("#opsResult").text('Error al eliminar usuario');
            });
        });
    };


    window.ControlWeb = ControlWeb;
}