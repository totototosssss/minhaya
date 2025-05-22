document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        questionNumberText: document.getElementById('questionNumberText'),
        questionText: document.getElementById('questionText'),
        answerInput: document.getElementById('answerInput'),
        submitAnswer: document.getElementById('submitAnswer'),
        resultText: document.getElementById('resultText'),
        correctAnswerText: document.getElementById('correctAnswerText'),
        nextQuestion: document.getElementById('nextQuestion'),
        loadingMessage: document.getElementById('loadingMessage'),
        errorMessage: document.getElementById('errorMessage'),
        quizEndMessage: document.getElementById('quizEndMessage'),
        quizArea: document.getElementById('quizArea'),
        resultArea: document.getElementById('resultArea'),
        correctRateText: document.getElementById('correctRateText'),
        disputeButton: document.getElementById('disputeButton'),
        enableSlowDisplayTextCheckbox: document.getElementById('enableSlowDisplayTextCheckbox'),
        stopSlowDisplayTextButton: document.getElementById('stopSlowDisplayTextButton')
    };

    const CSV_FILE_PATH = 'みんはや問題リストv1.27 - 問題リスト.csv';
    const COLUMN_INDICES = { QUESTION: 0, DISPLAY_ANSWER: 1, READING_ANSWER: 2 };
    const SLOW_DISPLAY_INTERVAL_MS = 80; // 1文字あたりの表示遅延 (ミリ秒) - 少し早めに調整

    let quizzes = [];
    let currentQuestionIndex = 0;
    let totalQuestions = 0;
    let correctAnswers = 0;
    let questionsAttempted = 0;
    let lastAnswerWasInitiallyIncorrect = false;
    
    let slowDisplayTextIntervalId = null;
    let currentQuestionFullText = ''; // 現在の問題の全文を保持
    let currentDisplayedCharIndex = 0; // ゆっくり表示中の文字インデックス

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async function loadQuizData() {
        try {
            ui.loadingMessage.style.display = 'block';
            ui.errorMessage.style.display = 'none';
            ui.quizArea.style.display = 'none';
            ui.correctRateText.textContent = '正答率: ---';

            const response = await fetch(CSV_FILE_PATH);
            if (!response.ok) throw new Error(`CSVファイル読み込みエラー (${response.status})`);
            
            let csvText = await response.text();
            if (csvText.startsWith('\uFEFF')) csvText = csvText.substring(1);

            const lines = csvText.trim().split(/\r?\n/);
            if (lines.length <= 1) throw new Error('CSVファイルにデータがありません。');

            quizzes = lines.slice(1).map(line => {
                const parts = line.split(',');
                const question = parts[COLUMN_INDICES.QUESTION]?.trim();
                const displayAnswer = parts[COLUMN_INDICES.DISPLAY_ANSWER]?.trim();
                const readingAnswer = parts[COLUMN_INDICES.READING_ANSWER]?.trim();
                if (question && readingAnswer) {
                    return { question, displayAnswer: displayAnswer || readingAnswer, readingAnswer };
                }
                return null;
            }).filter(quiz => quiz); 

            if (quizzes.length === 0) throw new Error('有効なクイズが見つかりません。');
            
            shuffleArray(quizzes); 
            totalQuestions = quizzes.length;
            currentQuestionIndex = 0;
            correctAnswers = 0;
            questionsAttempted = 0;

            ui.loadingMessage.style.display = 'none';
            ui.quizArea.style.display = 'block';
            displayQuestion();
        } catch (error) {
            console.error('読み込みエラー:', error);
            ui.loadingMessage.style.display = 'none';
            ui.errorMessage.textContent = `エラー: ${error.message}`;
            ui.errorMessage.style.display = 'block';
        }
    }
    
    function completeSlowDisplay() {
        clearInterval(slowDisplayTextIntervalId);
        slowDisplayTextIntervalId = null;
        ui.questionText.textContent = currentQuestionFullText; // 全文表示
        ui.stopSlowDisplayTextButton.style.display = 'none';
        ui.answerInput.disabled = false;
        ui.submitAnswer.disabled = false;
        ui.answerInput.focus();
    }

    function displayQuestion() {
        ui.resultArea.style.display = 'none';
        ui.quizEndMessage.style.display = 'none';
        ui.questionText.classList.remove('fade-in');
        void ui.questionText.offsetWidth; 
        ui.disputeButton.style.display = 'none';
        lastAnswerWasInitiallyIncorrect = false;

        // 前回のゆっくり表示が残っていればクリア
        if (slowDisplayTextIntervalId) {
            clearInterval(slowDisplayTextIntervalId);
            slowDisplayTextIntervalId = null;
        }
        ui.stopSlowDisplayTextButton.style.display = 'none';

        if (currentQuestionIndex < totalQuestions) {
            const currentQuiz = quizzes[currentQuestionIndex];
            currentQuestionFullText = currentQuiz.question; // 全文を保持
            currentDisplayedCharIndex = 0; // 表示インデックスリセット
            ui.questionText.textContent = ''; // 問題文表示エリアをクリア

            ui.questionNumberText.textContent = `第${currentQuestionIndex + 1}問`;
            
            if (ui.enableSlowDisplayTextCheckbox.checked) {
                ui.answerInput.disabled = true;
                ui.submitAnswer.disabled = true;
                ui.stopSlowDisplayTextButton.style.display = 'block';

                slowDisplayTextIntervalId = setInterval(() => {
                    if (currentDisplayedCharIndex < currentQuestionFullText.length) {
                        ui.questionText.textContent += currentQuestionFullText[currentDisplayedCharIndex];
                        currentDisplayedCharIndex++;
                    } else {
                        completeSlowDisplay(); // 表示完了
                    }
                }, SLOW_DISPLAY_INTERVAL_MS);
            } else { // 通常表示
                ui.questionText.textContent = currentQuestionFullText;
                ui.answerInput.disabled = false;
                ui.submitAnswer.disabled = false;
            }
            
            ui.answerInput.value = '';
            if (!ui.enableSlowDisplayTextCheckbox.checked) { // 通常表示の場合のみ即フォーカス
                 ui.answerInput.focus();
            }
            ui.submitAnswer.style.display = 'inline-block'; // 回答ボタンは常に表示
            ui.nextQuestion.style.display = 'none';
            ui.questionText.classList.add('fade-in');

        } else { // クイズ終了
            ui.quizArea.style.display = 'none';
            ui.resultArea.style.display = 'none';
            ui.quizEndMessage.style.display = 'block';
        }
    }

    function updateCorrectRateDisplay() {
        let rate = 0;
        if (questionsAttempted > 0) {
            rate = Math.round((correctAnswers / questionsAttempted) * 100);
        }
        ui.correctRateText.textContent = `正答率: ${rate}%`;
    }

    function checkAnswer() {
        if (currentQuestionIndex >= totalQuestions) return;
        
        // ゆっくり表示中なら停止して全文表示
        if (slowDisplayTextIntervalId) {
            completeSlowDisplay();
        }

        questionsAttempted++; 
        const userAnswer = ui.answerInput.value.trim();
        const currentQuiz = quizzes[currentQuestionIndex];
        const isCorrect = userAnswer === currentQuiz.readingAnswer;
        
        lastAnswerWasInitiallyIncorrect = false;

        if (isCorrect) {
            correctAnswers++; 
            ui.resultText.textContent = '正解！ 🎉';
            ui.resultText.className = 'correct';
            ui.disputeButton.style.display = 'none';
        } else {
            ui.resultText.textContent = '不正解... 😢';
            ui.resultText.className = 'incorrect';
            ui.disputeButton.style.display = 'inline-block';
            lastAnswerWasInitiallyIncorrect = true;
        }
        
        updateCorrectRateDisplay();
        
        let correctAnswerFormatted = `「${currentQuiz.readingAnswer}」`;
        if (currentQuiz.displayAnswer && currentQuiz.displayAnswer !== currentQuiz.readingAnswer) {
            correctAnswerFormatted = `「${currentQuiz.readingAnswer} (${currentQuiz.displayAnswer})」`;
        }
        ui.correctAnswerText.textContent = isCorrect ? '' : `正解は ${correctAnswerFormatted} です。`;
        
        ui.answerInput.disabled = true;
        ui.submitAnswer.disabled = true; // 回答後は送信ボタンも無効化
        ui.nextQuestion.style.display = 'inline-block';
        ui.resultArea.style.display = 'block';
        ui.nextQuestion.focus(); 
    }

    function handleDispute() {
        if (!lastAnswerWasInitiallyIncorrect) return;
        correctAnswers++;
        updateCorrectRateDisplay();
        ui.resultText.textContent = '判定変更: 正解！ 🤡';
        ui.resultText.className = 'correct';
        ui.disputeButton.style.display = 'none';
        lastAnswerWasInitiallyIncorrect = false;
    }

    // Event Listeners
    ui.submitAnswer.addEventListener('click', checkAnswer);
    ui.answerInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !ui.answerInput.disabled) {
            checkAnswer();
        }
    });
    ui.nextQuestion.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });
    ui.disputeButton.addEventListener('click', handleDispute);
    
    // ▼▼▼ 表示停止ボタンのイベントリスナー ▼▼▼
    ui.stopSlowDisplayTextButton.addEventListener('click', () => {
        if (slowDisplayTextIntervalId) { // ゆっくり表示中のみ動作
            completeSlowDisplay();
        }
    });
    // ▲▲▲ 表示停止ボタンのイベントリスナー ▲▲▲

    // Initialize
    loadQuizData();
});
