const socket = io({
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
});

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;


// ===============================
// SOCKET CONNECTION
// ===============================

socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
    console.log("⚠️ Socket connection error:", error.message);
});


// ===============================
// RENDER CHESS BOARD
// ===============================

const renderBoard = () => {
    const board = chess.board();

    boardElement.innerHTML = "";

    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");

            squareElement.classList.add(
                "square",
                (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");

                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );

                pieceElement.innerText = getpieceUnicode(square);
                pieceElement.draggable = true;

                pieceElement.addEventListener("dragstart", (e) => {
                    draggedPiece = pieceElement;

                    sourceSquare = {
                        row: rowindex,
                        col: squareindex
                    };

                    e.dataTransfer.setData("text/plain", "");

                    console.log("Drag start:", sourceSquare);
                });

                pieceElement.addEventListener("dragend", () => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();

                if (!draggedPiece || !sourceSquare) {
                    return;
                }

                const targetSquare = {
                    row: parseInt(squareElement.dataset.row),
                    col: parseInt(squareElement.dataset.col)
                };

                handleMove(sourceSquare, targetSquare);

                draggedPiece = null;
                sourceSquare = null;
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

// ===============================
// HANDLE MOVE
// ===============================

const handleMove = (source, target) => {

    if (!socket.connected) {

        console.log(
            "⚠️ Socket is not connected"
        );

        return;
    }


    const move = {

        from:
            `${String.fromCharCode(97 + source.col)}${8 - source.row}`,

        to:
            `${String.fromCharCode(97 + target.col)}${8 - target.row}`,

        promotion: "q"

    };


    console.log(
        "📤 Sending move:",
        move
    );


    socket.emit(
        "move",
        move
    );

};


// ===============================
// PIECE UNICODE
// ===============================

const getpieceUnicode = (piece) => {

    const unicodePieces = {

        p: "♟",
        r: "♜",
        n: "♞",
        b: "♝",
        q: "♛",
        k: "♚",

        P: "♙",
        R: "♖",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔"

    };

    return unicodePieces[piece.type] || "";

};


// ===============================
// PLAYER ROLE
// ===============================

socket.on(
    "playerRole",
    (role) => {

        console.log(
            "🎮 Player role:",
            role
        );

        playerRole = role;

        renderBoard();

    }
);


// ===============================
// SPECTATOR
// ===============================

socket.on(
    "spectatorRole",
    () => {

        console.log(
            "👀 Spectator mode"
        );

        playerRole = null;

        renderBoard();

    }
);


// ===============================
// BOARD STATE
// ===============================

socket.on(
    "boardState",
    (fen) => {

        console.log(
            "📋 Board state received:",
            fen
        );

        try {

            chess.load(fen);

            renderBoard();

        } catch (error) {

            console.log(
                "❌ Board update error:",
                error
            );

        }

    }
);


// ===============================
// MOVE RECEIVED
// ===============================

socket.on(
    "move",
    (move) => {

        console.log(
            "📥 Move received:",
            move
        );

        try {

            chess.move(move);

            renderBoard();

        } catch (error) {

            console.log(
                "❌ Move error:",
                error
            );

        }

    }
);


// ===============================
// INITIAL BOARD
// ===============================

renderBoard();