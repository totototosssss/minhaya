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
        stopSlowDisplayTextButton: document.getElementById('stopSlowDisplayTextButton'),
        // ▼▼▼ 速度調整UI要素追加 ▼▼▼
        speedControlArea: document.getElementById('speedControlArea'),
        slowDisplayTextSpeedSlider: document.getElementById('slowDisplayTextSpeedSlider'),
        speedValueDisplay: document.getElementById('speedValueDisplay')
        // ▲▲▲ 速度調整UI要素追加 ▲▲▲
    };

    const CSV_FILE_PATH = 'みんはや問題リストv1.27 - 問題リスト.csv';
    const COLUMN_INDICES = { QUESTION: 0, DISPLAY_ANSWER: 1, READING_ANSWER: 2 };
    // SLOW_DISPLAY_INTERVAL_MS はスライダーから取得するため定数ではなくなりました

    let quizzes = [];
    let currentQuestionIndex = 0;
    let totalQuestions = 0;
    let correctAnswers = 0;
    let questionsAttempted = 0;
    let lastAnswerWasInitiallyIncorrect = false;
    
    let slowDisplayTextIntervalId = null;
    let currentQuestionFullText = '';
    let currentDisplayedCharIndex = 0;

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    async function loadQuizData() {
        try {
            ui.loadingMessage.style.display = 'block';
            // (省略: 他の初期化処理) ...
            ui.correctRateText.textContent = '正答率: ---';

            const response = await fetch(CSV_FILE_PATH);
            if (!response.ok) throw new Error(`CSVエラー (${response.status})`);
            
            let csvText = await response.text();
            if (csvText.startsWith('\uFEFF')) csvText = csvText.substring(1);
            const lines = csvText.trim().split(/\r?\n/);
            if (lines.length <= 1) throw new Error('CSVデータなし');

            quizzes = lines.slice(1).map(line => { /* (省略: CSVパース処理) */
                const parts = line.split(',');
                const question = parts[COLUMN_INDICES.QUESTION]?.trim();
                const displayAnswer = parts[COLUMN_INDICES.DISPLAY_ANSWER]?.trim();
                const readingAnswer = parts[COLUMN_INDICES.READING_ANSWER]?.trim();
                if (question && readingAnswer) return { question, displayAnswer: displayAnswer || readingAnswer, readingAnswer };
                return null;
            }).filter(quiz => quiz); 

            if (quizzes.length === 0) throw new Error('有効なクイズなし');
            
            shuffleArray(quizzes); 
            totalQuestions = quizzes.length;
            currentQuestionIndex = 0; correctAnswers = 0; questionsAttempted = 0;

            ui.loadingMessage.style.display = 'none';
            ui.quizArea.style.display = 'block';
            displayQuestion();
        } catch (error) { /* (省略: エラー処理) */
            console.error('読み込みエラー:', error);
            ui.loadingMessage.style.display = 'none';
            ui.errorMessage.textContent = `エラー: ${error.message}`;
            ui.errorMessage.style.display = 'block';
        }
    }
    
    function completeSlowDisplay() {
        clearInterval(slowDisplayTextIntervalId);
        slowDisplayTextIntervalId = null;
        ui.questionText.textContent = currentQuestionFullText;
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

        if (slowDisplayTextIntervalId) { clearInterval(slowDisplayTextIntervalId); slowDisplayTextIntervalId = null; }
        ui.stopSlowDisplayTextButton.style.display = 'none';

        if (currentQuestionIndex < totalQuestions) {
            const currentQuiz = quizzes[currentQuestionIndex];
            currentQuestionFullText = currentQuiz.question;
            currentDisplayedCharIndex = 0;
            ui.questionText.textContent = '';
            ui.questionNumberText.textContent = `第${currentQuestionIndex + 1}問`;
            
            if (ui.enableSlowDisplayTextCheckbox.checked) {
                ui.answerInput.disabled = true;
                ui.submitAnswer.disabled = true;
                ui.stopSlowDisplayTextButton.style.display = 'block';
                
                // ▼▼▼ スライダーから表示速度を取得 ▼▼▼
                const displaySpeedMs = parseInt(ui.slowDisplayTextSpeedSlider.value, 10);
                // ▲▲▲ スライダーから表示速度を取得 ▲▲▲

                slowDisplayTextIntervalId = setInterval(() => {
                    if (currentDisplayedCharIndex < currentQuestionFullText.length) {
                        ui.questionText.textContent += currentQuestionFullText[currentDisplayedCharIndex];
                        currentDisplayedCharIndex++;
                    } else {
                        completeSlowDisplay();
                    }
                }, displaySpeedMs); // ← 取得した速度を使用
            } else {
                ui.questionText.textContent = currentQuestionFullText;
                ui.answerInput.disabled = false;
                ui.submitAnswer.disabled = false;
            }
            
            ui.answerInput.value = '';
            if (!ui.enableSlowDisplayTextCheckbox.checked) ui.answerInput.focus();
            ui.submitAnswer.style.display = 'inline-block';
            ui.nextQuestion.style.display = 'none';
            ui.questionText.classList.add('fade-in');
        } else {
            ui.quizArea.style.display = 'none';
            ui.resultArea.style.display = 'none';
            ui.quizEndMessage.style.display = 'block';
        }
    }

    function updateCorrectRateDisplay() { /* (省略: 変更なし) */
        let rate = 0;
        if (questionsAttempted > 0) rate = Math.round((correctAnswers / questionsAttempted) * 100);
        ui.correctRateText.textContent = `正答率: ${rate}%`;
    }

    function checkAnswer() { /* (省略: submitAnswerのdisabled化以外は大きな変更なし) */
        if (currentQuestionIndex >= totalQuestions) return;
        if (slowDisplayTextIntervalId) completeSlowDisplay();

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

    function handleDispute() { /* (省略: 変更なし) */
        if (!lastAnswerWasInitiallyIncorrect) return;
        correctAnswers++; updateCorrectRateDisplay();
        ui.resultText.textContent = '判定変更: 正解！ 🤡';
        ui.resultText.className = 'correct';
        ui.disputeButton.style.display = 'none';
        lastAnswerWasInitiallyIncorrect = false;
    }

    // Event Listeners
    ui.submitAnswer.addEventListener('click', checkAnswer);
    ui.answerInput.addEventListener('keypress', e => { if (e.key === 'Enter' && !ui.answerInput.disabled) checkAnswer(); });
    ui.nextQuestion.addEventListener('click', () => { currentQuestionIndex++; displayQuestion(); });
    ui.disputeButton.addEventListener('click', handleDispute);
    ui.stopSlowDisplayTextButton.addEventListener('click', () => { if (slowDisplayTextIntervalId) completeSlowDisplay(); });

    // ▼▼▼ チェックボックスとスライダーのイベントリスナー ▼▼▼
    ui.enableSlowDisplayTextCheckbox.addEventListener('change', () => {
        if (ui.enableSlowDisplayTextCheckbox.checked) {
            ui.speedControlArea.style.display = 'flex'; // 表示
        } else {
            ui.speedControlArea.style.display = 'none';  // 非表示
            // もしゆっくり表示中にチェックが外されたら、即座に全文表示
            if (slowDisplayTextIntervalId) {
                completeSlowDisplay();
            }
        }
    });

    ui.slowDisplayTextSpeedSlider.addEventListener('input', () => {
        // スライダーの値をリアルタイムで表示に反映
        ui.speedValueDisplay.textContent = `${ui.slowDisplayTextSpeedSlider.value}ms`;
        // 注意: 表示中の速度は変わらず、次に問題が表示される際にこの新しい値が使用されます。
        // もしリアルタイムで変更したい場合は、現在実行中のインターバルをクリアして新しい速度で再開する処理が必要になります。
    });
    // ▲▲▲ チェックボックスとスライダーのイベントリスナー ▲▲▲

    // Initialize
    loadQuizData();
});
