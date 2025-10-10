import java.io.*;
import java.net.*;

public class Server {
    public static void main(String[] args) throws IOException {
        ServerSocket serverSocket = new ServerSocket(8080);
        System.out.println("Server started. Waiting for two clients...");

        Socket client1 = serverSocket.accept();
        System.out.println("Client 1 connected.");
        Socket client2 = serverSocket.accept();
        System.out.println("Client 2 connected.");

        BufferedReader in1 = new BufferedReader(new InputStreamReader(client1.getInputStream()));
        PrintWriter out1 = new PrintWriter(client1.getOutputStream(), true);

        BufferedReader in2 = new BufferedReader(new InputStreamReader(client2.getInputStream()));
        PrintWriter out2 = new PrintWriter(client2.getOutputStream(), true);

        out1.println("You are Client 1. Start chatting!");
        out2.println("You are Client 2. Start chatting!");

        new Thread(() -> {
            try {
                String msg;
                while ((msg = in1.readLine()) != null) {
                    System.out.println("Client1: " + msg);
                    out2.println("Client1: " + msg);
                }
            } catch (IOException e) {
                System.out.println("Client1 disconnected.");
            }
        }).start();

        new Thread(() -> {
            try {
                String msg;
                while ((msg = in2.readLine()) != null) {
                    System.out.println("Client2: " + msg);
                    out1.println("Client2: " + msg);
                }
            } catch (IOException e) {
                System.out.println("Client2 disconnected.");
            }
        }).start();
    }
}