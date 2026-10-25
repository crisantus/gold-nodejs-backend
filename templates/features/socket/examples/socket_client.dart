// Add socket_io_client to the Flutter client, then own this connection in its session layer.
import 'package:socket_io_client/socket_io_client.dart' as io;

/// Creates a connection whose owner must dispose it on logout or teardown.
io.Socket connectGoldSocket(String baseUrl, String accessToken) {
  final socket = io.io(
    baseUrl,
    io.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': accessToken})
        .disableAutoConnect()
        .build(),
  );
  socket.onConnect((_) {
    socket.emitWithAck('system:ping', {'nonce': 'connection-check'}, ack: (_) {});
  });
  // On credential expiry or server disconnect, refresh through HTTP, replace
  // socket.auth, and reconnect. Restore missed domain state through the REST API.
  socket.connect();
  return socket;
}
