document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        questionText: document.getElementById('questionText'),
        answerInput: document.getElementById('answerInput'),
        submitAnswer: document.getElementById('submitAnswer'),
        resultText: document.getElementById('resultText'),
        correctAnswerText: document.getElementById('correctAnswerText'),
        nextQuestion: document.getElementById('nextQuestion'),
        loadingMessage: document.getElementById('loadingMessage'),
        errorMessage: document.getElementById('errorMessage'),
        quizArea: document.getElementById('quizArea'),
        resultArea: document.getElementById('resultArea')
    };

    // --- 設定値 ---
    const CSV_FILE_PATH = 'みんはや問題リストv1.27 - 問題リスト.csv';
    // ★★★ CSVの列インデックス (0から始まる) を実際のファイルに合わせてください ★★★
    const COLUMN_INDICES = {
        QUESTION: 0,        // 問題文の列 (例: 1列目なら0)
        DISPLAY_ANSWER: 1,  // 解答の表記 (例: 漢字など。2列目なら1)
        READING_ANSWER: 2   // 解答のよみがな (例: 3列目なら2)
    };

    let quizzes = [];
    let currentQuestionIndex = 0;

    // 配列をシャッフルする関数 (Fisher-Yates shuffle)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async function loadQuizData() {
        try {
            const response = await fetch(CSV_FILE_PATH);
            if (!response.ok) throw new Error(`CSV読み込み失敗: ${response.statusText}`);
            
            let csvText = await response.text();
            if (csvText.startsWith('\uFEFF')) csvText = csvText.substring(1); // BOM除去

            const lines = csvText.trim().split('\n');
            if (lines.length <= 1) throw new Error('CSVデータが少なすぎます (ヘッダー行のみ、または空)。');

            quizzes = lines
                .slice(1) // ★ 1行目(ヘッダー)をスキップ
                .map(line => {
                    const parts = line.split(',');
                    const question = parts[COLUMN_INDICES.QUESTION]?.trim();
                    const displayAnswer = parts[COLUMN_INDICES.DISPLAY_ANSWER]?.trim();
                    const readingAnswer = parts[COLUMN_INDICES.READING_ANSWER]?.trim();

                    // 問題文と「よみ」は必須
                    if (question && readingAnswer) {
                        // displayAnswer が空の場合、readingAnswer と同じとして扱う
                        return { question, displayAnswer: (displayAnswer || readingAnswer), readingAnswer };
                    }
                    return null;
                })
                .filter(quiz => quiz);

            if (quizzes.length === 0) throw new Error('有効なクイズデータなし。CSV形式/列指定確認。');
            
            shuffleArray(quizzes); // ★ クイズ配列をシャッフル

            ui.loadingMessage.style.display = 'none';
            ui.quizArea.style.display = 'block';
            displayQuestion();
        } catch (error) {
            console.error('クイズデータ読み込みエラー:', error);
            ui.loadingMessage.style.display = 'none';
            ui.errorMessage.textContent = `エラー: ${error.message}`;
        }
    }

    function displayQuestion() {
        ui.resultArea.style.display = 'none';
        ui.questionText.classList.remove('fade-in');
        void ui.questionText.offsetWidth;  // アニメーション再トリガーのためのリフロー強制

        if (currentQuestionIndex < quizzes.length) {
            const { question } = quizzes[currentQuestionIndex];
            ui.questionText.textContent = `問題: ${question}`;
            ui.answerInput.value = '';
            ui.answerInput.disabled = false;
            ui.submitAnswer.style.display = 'inline-block';
            ui.nextQuestion.style.display = 'none';
            ui.questionText.classList.add('fade-in');
            ui.answerInput.focus();
        } else {
            ui.quizArea.style.display = 'none';
            ui.resultArea.style.display = 'block';
            ui.resultText.textContent = 'クイズ全問終了！お疲れ様でした！';
            ui.resultText.className = ''; // スタイルクラスをクリア
            ui.correctAnswerText.textContent = '';
            ui.nextQuestion.style.display = 'none';
        }
    }

    function checkAnswer() {
        if (currentQuestionIndex >= quizzes.length) return;

        const userAnswer = ui.answerInput.value.trim();
        const { displayAnswer, readingAnswer } = quizzes[currentQuestionIndex];
        
        const isCorrect = userAnswer === readingAnswer; // 「よみ」で正誤判定
        
        ui.resultText.textContent = isCorrect ? '正解！' : '不正解...';
        ui.resultText.className = isCorrect ? 'correct' : 'incorrect'; // 色付け用クラス
        
        // ★ 答えの表示方法を変更
        let correctAnswerFormatted = `「${readingAnswer}」`;
        // displayAnswer が存在し、かつ readingAnswer と異なる場合のみ括弧表記を追加
        if (displayAnswer && displayAnswer !== readingAnswer) {
            correctAnswerFormatted = `「${readingAnswer} (${displayAnswer})」`;
        }
        ui.correctAnswerText.textContent = isCorrect ? '' : `正解は ${correctAnswerFormatted} です。`;
        
        ui.answerInput.disabled = true;
        ui.submitAnswer.style.display = 'none';
        ui.nextQuestion.style.display = 'inline-block';
        ui.resultArea.style.display = 'block';
    }

    ui.submitAnswer.addEventListener('click', checkAnswer);
    ui.answerInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !ui.answerInput.disabled) { // 回答入力が有効な場合のみEnterキーで送信
             checkAnswer();
        }
    });
    ui.nextQuestion.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    loadQuizData();
});
