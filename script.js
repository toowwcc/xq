// 音效管理类
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.2; // 默认音量20%
        this.initAudioContext();
    }

    get isEnabled() {
        return this.enabled;
    }

    get currentVolume() {
        return this.volume;
    }

    setVolume(volume) {
        // volume 范围 0-1
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.volume === 0) {
            this.enabled = false;
        } else if (!this.enabled && this.volume > 0) {
            this.enabled = true;
        }
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // 创建棋子落下音效
    createPieceDropSound() {
        if (!this.audioContext || !this.enabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // 设置音效参数 - 模拟木质棋子落在棋盘上的声音
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3 * this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * this.volume, this.audioContext.currentTime + 0.2);
        
        oscillator.type = 'triangle';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }

    // 创建吃子音效
    createCaptureSound() {
        if (!this.audioContext || !this.enabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // 设置音效参数 - 更响亮的音效表示吃子
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.4 * this.volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01 * this.volume, this.audioContext.currentTime + 0.25);
        
        oscillator.type = 'sawtooth';
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.25);
    }

    // 播放棋子移动音效
    playMoveSound() {
        this.createPieceDropSound();
    }

    // 播放吃子音效
    playCaptureSound() {
        this.createCaptureSound();
    }

    // 创建将军警告音效
    createCheckSound() {
        if (!this.audioContext || !this.enabled) return;

        // 创建一个更紧急的音效序列
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 高频警告音
                oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(0.4 * this.volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01 * this.volume, this.audioContext.currentTime + 0.15);
                
                oscillator.type = 'sine';
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + 0.15);
            }, i * 200);
        }
    }

    // 播放将军警告音效
    playCheckSound() {
        this.createCheckSound();
    }

    // 切换音效开关
    toggleSound() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

class ChineseChess {
    constructor() {
        this.board = [];
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.selectedPosition = null;
        this.gameOver = false;
        this.capturedPieces = { red: [], black: [] };
        this.soundManager = new SoundManager();
        this.pendingCheckWarning = null;  // 待显示的将军警告
        this.settings = {
            checkWarning: true,  // 将军提示开关
            soundEnabled: true   // 音效开关
        };
        
        this.initializeBoard();
        this.createBoardHTML();
        this.bindEvents();
    }

    // 初始化棋盘
    initializeBoard() {
        // 创建10x9的棋盘
        this.board = Array(10).fill(null).map(() => Array(9).fill(null));
        
        // 棋子定义
        const pieces = {
            // 黑方棋子 (上方)
            black: {
                0: ['車', '馬', '象', '士', '將', '士', '象', '馬', '車'],
                2: [null, '炮', null, null, null, null, null, '炮', null],
                3: ['兵', null, '兵', null, '兵', null, '兵', null, '兵']
            },
            // 红方棋子 (下方)
            red: {
                9: ['車', '馬', '相', '仕', '帥', '仕', '相', '馬', '車'],
                7: [null, '砲', null, null, null, null, null, '砲', null],
                6: ['兵', null, '兵', null, '兵', null, '兵', null, '兵']
            }
        };

        // 放置黑方棋子
        Object.entries(pieces.black).forEach(([row, pieces]) => {
            pieces.forEach((piece, col) => {
                if (piece) {
                    this.board[row][col] = { type: piece, color: 'black' };
                }
            });
        });

        // 放置红方棋子
        Object.entries(pieces.red).forEach(([row, pieces]) => {
            pieces.forEach((piece, col) => {
                if (piece) {
                    this.board[row][col] = { type: piece, color: 'red' };
                }
            });
        });
    }

    // 创建棋盘HTML
    createBoardHTML() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'chess-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                // 添加河界样式
                if (row === 4 || row === 5) {
                    cell.classList.add('river');
                }

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `chess-piece ${piece.color}`;
                    pieceElement.textContent = piece.type;
                    cell.appendChild(pieceElement);
                }

                boardElement.appendChild(cell);
            }
        }

        // 添加河界文字
        this.addRiverText();
    }

    // 添加河界文字
    addRiverText() {
        const boardElement = document.getElementById('chess-board');
        
        // 创建河界文字容器
        const riverContainer = document.createElement('div');
        riverContainer.style.position = 'absolute';
        riverContainer.style.top = '45%';
        riverContainer.style.left = '20%';
        riverContainer.style.right = '20%';
        riverContainer.style.height = '10%';
        riverContainer.style.display = 'flex';
        riverContainer.style.justifyContent = 'space-between';
        riverContainer.style.alignItems = 'center';
        riverContainer.style.pointerEvents = 'none';
        
        const leftText = document.createElement('div');
        leftText.className = 'river-text';
        leftText.textContent = '楚河';
        
        const rightText = document.createElement('div');
        rightText.className = 'river-text';
        rightText.textContent = '漢界';
        
        riverContainer.appendChild(leftText);
        riverContainer.appendChild(rightText);
        boardElement.appendChild(riverContainer);
    }

    // 绑定事件
    bindEvents() {
        const boardElement = document.getElementById('chess-board');
        boardElement.addEventListener('click', (e) => this.handleCellClick(e));
        
        const restartBtn = document.getElementById('restart-btn');
        restartBtn.addEventListener('click', () => this.restartGame());
        
        const settingsBtn = document.getElementById('settings-btn');
        settingsBtn.addEventListener('click', () => this.openSettings());
        
        const closeSettingsBtn = document.getElementById('close-settings');
        closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        
        const soundToggle = document.getElementById('sound-toggle');
        soundToggle.addEventListener('click', () => this.toggleSound());
        
        const checkWarningToggle = document.getElementById('check-warning-toggle');
        checkWarningToggle.addEventListener('click', () => this.toggleCheckWarning());
        
        // 音量控制事件
        const volumeIcon = document.getElementById('volume-icon');
        volumeIcon.addEventListener('click', () => this.toggleVolumeIcon());
        
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', (e) => this.updateVolume(e.target.value));
        
        // 点击面板外部关闭设置
        const settingsPanel = document.getElementById('settings-panel');
        settingsPanel.addEventListener('click', (e) => {
            if (e.target === settingsPanel) {
                this.closeSettings();
            }
        });
    }

    // 处理棋盘点击
    handleCellClick(e) {
        if (this.gameOver) return;

        const cell = e.target.closest('.chess-cell');
        if (!cell) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const piece = this.board[row][col];
        
        console.log(`点击位置: (${row}, ${col}), 棋子:`, piece, `当前玩家: ${this.currentPlayer}`);

        if (this.selectedPiece) {
            // 已选中棋子，尝试移动
            if (this.isValidMove(this.selectedPosition, { row, col })) {
                this.movePiece(this.selectedPosition, { row, col });
                this.clearSelection();
                
                // 先检查游戏是否结束（将/帅被吃）
                this.checkGameEnd();
                
                // 如果游戏没有结束，再切换玩家
                if (!this.gameOver) {
                    this.switchPlayer();
                }
            } else if (piece && piece.color === this.currentPlayer) {
                // 选择新的棋子
                this.selectPiece(row, col);
            } else {
                this.clearSelection();
            }
        } else if (piece && piece.color === this.currentPlayer) {
            // 选择棋子
            this.selectPiece(row, col);
        }
    }

    // 选择棋子
    selectPiece(row, col) {
        this.clearSelection();
        this.selectedPiece = this.board[row][col];
        this.selectedPosition = { row, col };
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('selected');
        
        const pieceElement = cell.querySelector('.chess-piece');
        if (pieceElement) {
            pieceElement.classList.add('selected');
        }

        // 显示可能的移动位置
        this.showPossibleMoves(row, col);
    }

    // 显示可能的移动位置
    showPossibleMoves(row, col) {
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.isValidMove({ row, col }, { row: r, col: c })) {
                    const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    cell.classList.add('possible-move');
                }
            }
        }
    }

    // 清除选择
    clearSelection() {
        document.querySelectorAll('.chess-cell').forEach(cell => {
            cell.classList.remove('selected', 'possible-move');
        });
        document.querySelectorAll('.chess-piece').forEach(piece => {
            piece.classList.remove('selected');
        });
        this.selectedPiece = null;
        this.selectedPosition = null;
    }

    // 移动棋子
    movePiece(from, to) {
        const capturedPiece = this.board[to.row][to.col];
        
        // 检查是否吃掉了将/帅
        if (capturedPiece && (capturedPiece.type === '帥' || capturedPiece.type === '將')) {
            console.log(`${capturedPiece.type}被吃掉了！游戏结束！`);
        }
        
        // 播放音效
        if (capturedPiece) {
            // 吃子音效
            this.soundManager.playCaptureSound();
            this.capturedPieces[capturedPiece.color].push(capturedPiece);
            this.updateCapturedPieces();
        } else {
            // 普通移动音效
            this.soundManager.playMoveSound();
        }

        // 移动棋子
        this.board[to.row][to.col] = this.board[from.row][from.col];
        this.board[from.row][from.col] = null;

        // 更新显示
        this.updateBoardDisplay();
        
        // 检查移动后是否形成将军
        if (this.settings.checkWarning) {
            const opponentColor = this.currentPlayer === 'red' ? 'black' : 'red';
            const opponentName = opponentColor === 'red' ? '红方' : '黑方';
            
            if (this.isInCheck(opponentColor)) {
                console.log(`移动后检测到：${this.currentPlayer}方将军了${opponentName}！`);
                // 设置一个标记，在switchPlayer时显示将军警告
                this.pendingCheckWarning = opponentName;
            }
        }
        
        // 检查游戏是否结束（将/帅被吃）
        this.checkGameEnd();
    }

    // 更新棋盘显示（不重新绑定事件）
    updateBoardDisplay() {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const existingPiece = cell.querySelector('.chess-piece');
                
                // 移除现有棋子
                if (existingPiece) {
                    existingPiece.remove();
                }
                
                // 添加新棋子
                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `chess-piece ${piece.color}`;
                    pieceElement.textContent = piece.type;
                    cell.appendChild(pieceElement);
                }
            }
        }
    }

    // 更新俘获的棋子显示
    updateCapturedPieces() {
        ['red', 'black'].forEach(color => {
            const container = document.getElementById(`${color}-captured`);
            container.innerHTML = '';
            
            this.capturedPieces[color].forEach(piece => {
                const pieceElement = document.createElement('div');
                pieceElement.className = `captured-piece ${piece.color}`;
                pieceElement.textContent = piece.type;
                container.appendChild(pieceElement);
            });
        });
    }

    // 验证移动是否合法
    isValidMove(from, to) {
        if (from.row === to.row && from.col === to.col) return false;
        if (to.row < 0 || to.row >= 10 || to.col < 0 || to.col >= 9) return false;

        const piece = this.board[from.row][from.col];
        const targetPiece = this.board[to.row][to.col];

        // 不能吃自己的棋子
        if (targetPiece && targetPiece.color === piece.color) return false;

        // 根据棋子类型验证移动规则
        return this.validatePieceMove(piece, from, to);
    }

    // 验证特定棋子的移动规则
    validatePieceMove(piece, from, to) {
        const dx = Math.abs(to.col - from.col);
        const dy = Math.abs(to.row - from.row);
        const isRed = piece.color === 'red';

        switch (piece.type) {
            case '帥':
            case '將':
                // 将/帅：只能在九宫内移动，每次一格
                const palaceRows = isRed ? [7, 8, 9] : [0, 1, 2];
                const palaceCols = [3, 4, 5];
                return palaceRows.includes(to.row) && palaceCols.includes(to.col) &&
                       ((dx === 1 && dy === 0) || (dx === 0 && dy === 1));

            case '仕':
            case '士':
                // 士：只能在九宫内斜着移动
                const guardRows = isRed ? [7, 8, 9] : [0, 1, 2];
                const guardCols = [3, 4, 5];
                return guardRows.includes(to.row) && guardCols.includes(to.col) &&
                       dx === 1 && dy === 1;

            case '相':
            case '象':
                // 相/象：斜着走两格，不能过河，不能被蹩脚
                const elephantRows = isRed ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
                if (!elephantRows.includes(to.row)) return false;
                if (dx !== 2 || dy !== 2) return false;
                // 检查蹩脚点
                const blockRow = from.row + (to.row - from.row) / 2;
                const blockCol = from.col + (to.col - from.col) / 2;
                return !this.board[blockRow][blockCol];

            case '馬':
                // 马：走日字，不能被蹩脚
                if (!((dx === 2 && dy === 1) || (dx === 1 && dy === 2))) return false;
                // 检查蹩脚点
                if (dx === 2) {
                    const blockCol = from.col + (to.col - from.col) / 2;
                    return !this.board[from.row][blockCol];
                } else {
                    const blockRow = from.row + (to.row - from.row) / 2;
                    return !this.board[blockRow][from.col];
                }

            case '車':
                // 车：直线移动，路径不能有棋子
                if (dx !== 0 && dy !== 0) return false;
                return this.isPathClear(from, to);

            case '炮':
            case '砲':
                // 炮：直线移动，吃子时中间必须有一个棋子
                if (dx !== 0 && dy !== 0) return false;
                const targetPiece = this.board[to.row][to.col];
                if (targetPiece) {
                    // 吃子，中间必须有且仅有一个棋子
                    return this.countPiecesInPath(from, to) === 1;
                } else {
                    // 不吃子，路径必须清空
                    return this.isPathClear(from, to);
                }

            case '兵':
                // 兵：向前一格，过河后可以左右移动
                if (isRed) {
                    if (from.row > 4) {
                        // 未过河，只能向前
                        return to.row === from.row - 1 && to.col === from.col;
                    } else {
                        // 已过河，可以向前或左右
                        return (to.row === from.row - 1 && to.col === from.col) ||
                               (to.row === from.row && Math.abs(to.col - from.col) === 1);
                    }
                } else {
                    if (from.row < 5) {
                        // 未过河，只能向前
                        return to.row === from.row + 1 && to.col === from.col;
                    } else {
                        // 已过河，可以向前或左右
                        return (to.row === from.row + 1 && to.col === from.col) ||
                               (to.row === from.row && Math.abs(to.col - from.col) === 1);
                    }
                }

            default:
                return false;
        }
    }

    // 检查路径是否清空
    isPathClear(from, to) {
        const stepRow = to.row === from.row ? 0 : (to.row - from.row) / Math.abs(to.row - from.row);
        const stepCol = to.col === from.col ? 0 : (to.col - from.col) / Math.abs(to.col - from.col);

        let currentRow = from.row + stepRow;
        let currentCol = from.col + stepCol;

        while (currentRow !== to.row || currentCol !== to.col) {
            if (this.board[currentRow][currentCol]) return false;
            currentRow += stepRow;
            currentCol += stepCol;
        }

        return true;
    }

    // 计算路径中的棋子数量
    countPiecesInPath(from, to) {
        const stepRow = to.row === from.row ? 0 : (to.row - from.row) / Math.abs(to.row - from.row);
        const stepCol = to.col === from.col ? 0 : (to.col - from.col) / Math.abs(to.col - from.col);

        let count = 0;
        let currentRow = from.row + stepRow;
        let currentCol = from.col + stepCol;

        while (currentRow !== to.row || currentCol !== to.col) {
            if (this.board[currentRow][currentCol]) count++;
            currentRow += stepRow;
            currentCol += stepCol;
        }

        return count;
    }

    // 切换玩家
    switchPlayer() {
        const previousPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        const playerName = this.currentPlayer === 'red' ? '红方' : '黑方';
        document.getElementById('current-player').textContent = playerName;
        
        // 检查是否有待显示的将军警告
        if (this.pendingCheckWarning && this.settings.checkWarning) {
            console.log(`显示待处理的将军警告: ${this.pendingCheckWarning}`);
            this.showCheckWarning(this.pendingCheckWarning);
            this.pendingCheckWarning = null;
            return;
        }
        
        // 检查当前玩家是否被将军
        console.log(`切换到${playerName}，检查将军状态...`);
        console.log(`将军提示开关: ${this.settings.checkWarning}`);
        
        if (this.settings.checkWarning && this.isInCheck(this.currentPlayer)) {
            this.showCheckWarning(playerName);
        } else {
            console.log(`${playerName}未被将军`);
            document.getElementById('game-message').textContent = `轮到${playerName}下棋`;
        }
    }

    // 检查游戏结束
    checkGameEnd() {
        // 检查将/帅是否被吃
        let redKing = false, blackKing = false;
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    if (piece.type === '帥') redKing = true;
                    if (piece.type === '將') blackKing = true;
                }
            }
        }

        if (!redKing) {
            console.log('红方的帥被吃掉了！黑方获胜！');
            this.endGame('🎉 黑方获胜！红方的帥被吃掉了！');
        } else if (!blackKing) {
            console.log('黑方的將被吃掉了！红方获胜！');
            this.endGame('🎉 红方获胜！黑方的將被吃掉了！');
        }
    }

    // 结束游戏
    endGame(message) {
        this.gameOver = true;
        const messageElement = document.getElementById('game-message');
        
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.style.color = '#ff6600';
            messageElement.style.fontWeight = 'bold';
            messageElement.style.fontSize = '18px';
            console.log(`游戏结束: ${message}`);
        }
        
        // 播放胜利音效
        if (this.soundManager.enabled) {
            // 使用吃子音效作为胜利音效
            this.soundManager.playCaptureSound();
        }
        
        this.clearSelection();
        
        // 3秒后提示重新开始
        setTimeout(() => {
            if (messageElement && this.gameOver) {
                messageElement.textContent += ' 点击"重新开始"按钮开始新游戏';
            }
        }, 3000);
    }

    // 重新开始游戏
    restartGame() {
        this.gameOver = false;
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.selectedPosition = null;
        this.capturedPieces = { red: [], black: [] };
        this.pendingCheckWarning = null;
        
        this.initializeBoard();
        this.updateBoardDisplay();
        this.updateCapturedPieces();
        this.clearSelection();
        
        document.getElementById('current-player').textContent = '红方';
        document.getElementById('game-message').textContent = '游戏开始，红方先行';
    }

    // 检查指定玩家是否被将军
    isInCheck(player) {
        // 找到指定玩家的帅/将
        let kingPosition = null;
        const kingType = player === 'red' ? '帥' : '將';
        
        console.log(`检查${player}方的${kingType}是否被将军...`);
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === player && piece.type === kingType) {
                    kingPosition = { row, col };
                    console.log(`找到${kingType}位置: (${row}, ${col})`);
                    break;
                }
            }
            if (kingPosition) break;
        }
        
        if (!kingPosition) {
            console.log(`未找到${player}方的${kingType}！`);
            return false;
        }
        
        // 检查对方所有棋子是否能攻击到帅/将
        const opponentColor = player === 'red' ? 'black' : 'red';
        console.log(`检查${opponentColor}方棋子是否能攻击${kingType}...`);
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 9; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === opponentColor) {
                    // 使用基础移动规则检查，避免递归
                    if (this.isBasicValidMove({ row, col }, kingPosition)) {
                        console.log(`${piece.type}(${row}, ${col})可以攻击到${kingType}！`);
                        return true;
                    }
                }
            }
        }
        
        console.log(`${player}方的${kingType}安全，未被将军`);
        return false;
    }

    // 基础移动验证（不包含将军检查，避免递归）
    isBasicValidMove(from, to) {
        if (from.row === to.row && from.col === to.col) return false;
        if (to.row < 0 || to.row >= 10 || to.col < 0 || to.col >= 9) return false;

        const piece = this.board[from.row][from.col];
        const targetPiece = this.board[to.row][to.col];

        // 不能吃自己的棋子
        if (targetPiece && targetPiece.color === piece.color) return false;

        // 根据棋子类型验证移动规则
        return this.validatePieceMove(piece, from, to);
    }

    // 显示将军警告
    showCheckWarning(playerName) {
        console.log(`检测到将军: ${playerName}被将军了！`);
        const messageElement = document.getElementById('game-message');
        
        if (messageElement) {
            messageElement.textContent = `⚠️ ${playerName}被将军了！`;
            messageElement.style.color = '#ff4444';
            messageElement.style.fontWeight = 'bold';
            console.log(`将军警告已显示: ${messageElement.textContent}`);
        } else {
            console.error('找不到game-message元素！');
        }
        
        // 播放将军警告音效
        if (this.soundManager.enabled) {
            this.soundManager.playCheckSound();
        }
        
        // 3秒后恢复正常显示
        const currentPlayerName = playerName; // 保存当前值
        setTimeout(() => {
            const messageEl = document.getElementById('game-message');
            if (messageEl) {
                messageEl.textContent = `轮到${currentPlayerName}下棋`;
                messageEl.style.color = '';
                messageEl.style.fontWeight = '';
                console.log(`将军警告已恢复正常显示`);
            }
        }, 3000);
    }

    // 打开设置面板
    openSettings() {
        const settingsPanel = document.getElementById('settings-panel');
        settingsPanel.style.display = 'flex';
        this.updateSettingsDisplay();
    }

    // 关闭设置面板
    closeSettings() {
        const settingsPanel = document.getElementById('settings-panel');
        settingsPanel.style.display = 'none';
    }

    // 更新设置显示
    updateSettingsDisplay() {
        const soundToggle = document.getElementById('sound-toggle');
        const checkWarningToggle = document.getElementById('check-warning-toggle');
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');
        const volumeIcon = document.getElementById('volume-icon');
        
        // 更新音效按钮
        if (this.soundManager.isEnabled) {
            soundToggle.textContent = '🔊 开启';
            soundToggle.className = 'toggle-btn sound-on';
        } else {
            soundToggle.textContent = '🔇 关闭';
            soundToggle.className = 'toggle-btn sound-off';
        }
        
        // 更新音量控制
        const volumePercent = Math.round(this.soundManager.currentVolume * 100);
        volumeSlider.value = volumePercent;
        volumeValue.textContent = volumePercent + '%';
        
        // 更新音量图标
        if (volumePercent === 0) {
            volumeIcon.textContent = '🔇';
        } else if (volumePercent < 30) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
        }
        
        // 更新将军提示按钮
        if (this.settings.checkWarning) {
            checkWarningToggle.textContent = '⚠️ 开启';
            checkWarningToggle.className = 'toggle-btn warning-on';
        } else {
            checkWarningToggle.textContent = '⚠️ 关闭';
            checkWarningToggle.className = 'toggle-btn warning-off';
        }
    }

    // 切换音效
    toggleSound() {
        if (this.soundManager.isEnabled) {
            // 当前开启，设为静音
            this.soundManager.setVolume(0);
        } else {
            // 当前关闭，恢复到20%
            this.soundManager.setVolume(0.2);
        }
        this.updateSettingsDisplay();
    }

    // 切换将军提示
    toggleCheckWarning() {
        this.settings.checkWarning = !this.settings.checkWarning;
        this.updateSettingsDisplay();
    }

    // 点击音量图标切换静音/恢复
    toggleVolumeIcon() {
        const currentVolume = this.soundManager.currentVolume;
        if (currentVolume === 0) {
            // 当前静音，恢复到20%
            this.soundManager.setVolume(0.2);
        } else {
            // 当前有声音，设为静音
            this.soundManager.setVolume(0);
        }
        this.updateSettingsDisplay();
    }

    // 更新音量
    updateVolume(value) {
        const volume = parseInt(value) / 100;
        this.soundManager.setVolume(volume);
        this.updateSettingsDisplay();
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    const game = new ChineseChess();
    
    // 添加用户交互监听器来启用音频上下文
    document.addEventListener('click', function enableAudio() {
        if (game.soundManager.audioContext && game.soundManager.audioContext.state === 'suspended') {
            game.soundManager.audioContext.resume();
        }
        // 只需要执行一次
        document.removeEventListener('click', enableAudio);
    }, { once: true });
});