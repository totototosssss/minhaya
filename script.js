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
        speedControlArea: document.getElementById('speedControlArea'),
        slowDisplayTextSpeedSlider: document.getElementById('slowDisplayTextSpeedSlider'),
        speedValueDisplay: document.getElementById('speedValueDisplay'),
        // ▼▼▼ ヒント機能UI要素追加 ▼▼▼
        hintButton: document.getElementById('hintButton'),
        hintTextDisplay: document.getElementById('hintTextDisplay')
        // ▲▲▲ ヒント機能UI要素追加 ▲▲▲
    };

    const CSV_FILE_PATH = 'みんはや問題リストv1.27 - 問題リスト.csv';
    const COLUMN_INDICES = { QUESTION: 0, DISPLAY_ANSWER: 1, READING_ANSWER: 2 };

    let quizzes = [];
    let currentQuestionIndex = 0;
    let totalQuestions = 0;
    let correctAnswers = 0;
    let questionsAttempted = 0;
    let lastAnswerWasInitiallyIncorrect = false;
    
    let slowDisplayTextIntervalId = null;
    let currentQuestionFullText = '';
    let currentDisplayedCharIndex = 0;
    let stoppedAtIndex = -1; // ▼▼▼ どこで表示停止したかを記録する変数 ▼▼▼

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function initializeQuiz() {
        const useSlowRead = window.confirm("問題文をゆっくり表示する機能を使用しますか？\n（この設定は後でチェックボックスから変更できます）");
        ui.enableSlowDisplayTextCheckbox.checked = useSlowRead;
        if (useSlowRead) {
            ui.speedControlArea.style.display = 'flex';
        } else {
            ui.speedControlArea.style.display = 'none';
        }
        ui.speedValueDisplay.textContent = `${ui.slowDisplayTextSpeedSlider.value}ms`;
        loadQuizData();
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
                if (question && readingAnswer) return { question, displayAnswer: displayAnswer || readingAnswer, readingAnswer };
                return null;
            }).filter(quiz => quiz); 

            if (quizzes.length === 0) throw new Error('有効なクイズが見つかりませんでした。');
            shuffleArray(quizzes); 
            totalQuestions = quizzes.length;
            currentQuestionIndex = 0; correctAnswers = 0; questionsAttempted = 0;

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
    
    function onSlowDisplayNaturalFinish() {
        if(slowDisplayTextIntervalId) clearInterval(slowDisplayTextIntervalId);
        slowDisplayTextIntervalId = null;
        stoppedAtIndex = -1; // 自然完了なので停止位置記録は不要
        ui.stopSlowDisplayTextButton.style.display = 'none';
        ui.answerInput.disabled = false;
        ui.submitAnswer.disabled = false;
        ui.answerInput.focus();
    }

    function stopProgressiveDisplayAndEnableInput() {
        if (slowDisplayTextIntervalId) {
            clearInterval(slowDisplayTextIntervalId);
            slowDisplayTextIntervalId = null;
            stoppedAtIndex = currentDisplayedCharIndex; // ▼▼▼ 停止位置を記録 ▼▼▼
        }
        ui.stopSlowDisplayTextButton.style.display = 'none';
        ui.answerInput.disabled = false;
        ui.submitAnswer.disabled = false;
        ui.answerInput.focus();
    }

    function startOrRestartSlowDisplayInterval() {
        if (slowDisplayTextIntervalId) { clearInterval(slowDisplayTextIntervalId); }
        const displaySpeedMs = parseInt(ui.slowDisplayTextSpeedSlider.value, 10);
        if (currentDisplayedCharIndex >= currentQuestionFullText.length) {
            onSlowDisplayNaturalFinish(); 
            return;
        }
        slowDisplayTextIntervalId = setInterval(() => {
            if (currentDisplayedCharIndex < currentQuestionFullText.length) {
                ui.questionText.textContent += currentQuestionFullText[currentDisplayedCharIndex];
                currentDisplayedCharIndex++;
            } else {
                onSlowDisplayNaturalFinish();
            }
        }, displaySpeedMs);
    }

    function displayQuestion() {
        ui.resultArea.style.display = 'none';
        ui.quizEndMessage.style.display = 'none';
        ui.questionText.classList.remove('fade-in');
        void ui.questionText.offsetWidth; 
        ui.disputeButton.style.display = 'none';
        lastAnswerWasInitiallyIncorrect = false;
        stoppedAtIndex = -1; // ▼▼▼ 新しい問題の開始時に停止位置をリセット ▼▼▼

        if (slowDisplayTextIntervalId) { clearInterval(slowDisplayTextIntervalId); slowDisplayTextIntervalId = null; }
        ui.stopSlowDisplayTextButton.style.display = 'none';

        // ▼▼▼ ヒント表示をリセット ▼▼▼
        ui.hintTextDisplay.textContent = '';
        ui.hintButton.disabled = false; // ヒントボタンを有効化
        // ▲▲▲ ヒント表示をリセット ▲▲▲

        if (currentQuestionIndex < totalQuestions) {
            const currentQuiz = quizzes[currentQuestionIndex];
            currentQuestionFullText = currentQuiz.question;
            currentDisplayedCharIndex = 0;
            ui.questionText.textContent = ''; // 必ずクリア
            ui.questionText.innerHTML = ''; // スタイル用spanもクリア

            ui.questionNumberText.textContent = `第${currentQuestionIndex + 1}問`;
            
            if (ui.enableSlowDisplayTextCheckbox.checked) {
                ui.answerInput.disabled = true;
                ui.submitAnswer.disabled = true;
                ui.stopSlowDisplayTextButton.style.display = 'block';
                startOrRestartSlowDisplayInterval();
            } else {
                ui.questionText.textContent = currentQuestionFullText;
                ui.answerInput.disabled = false;
                ui.submitAnswer.disabled = false;
            }
            
            ui.answerInput.value = '';
            if (!ui.enableSlowDisplayTextCheckbox.checked || !slowDisplayTextIntervalId) { 
                 ui.answerInput.focus();
            }
            ui.submitAnswer.style.display = 'inline-block';
            ui.nextQuestion.style.display = 'none';
            ui.questionText.classList.add('fade-in'); // これはテキスト内容セット後に適用したい
        } else {
            ui.quizArea.style.display = 'none';
            ui.resultArea.style.display = 'none';
            ui.quizEndMessage.style.display = 'block';
        }
    }

    function updateCorrectRateDisplay() {
        let rate = 0; if (questionsAttempted > 0) rate = Math.round((correctAnswers / questionsAttempted) * 100); ui.correctRateText.textContent = `正答率: ${rate}%`;
    }

    function checkAnswer() {
        if (currentQuestionIndex >= totalQuestions) return;
        if (slowDisplayTextIntervalId) { // 回答時にゆっくり表示がまだ動いていたら強制停止（テキストはそのまま）
            clearInterval(slowDisplayTextIntervalId);
            slowDisplayTextIntervalId = null;
            // stoppedAtIndex は stopProgressiveDisplayAndEnableInput で設定されるので、ここでは不要
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
        
        // 回答結果表示後、問題文が途中だった場合は全文表示し、停止位置をマーク
        if (ui.questionText.textContent.length < currentQuestionFullText.length) {
            ui.questionText.textContent = currentQuestionFullText; // まず全文表示
        }
        // ▼▼▼ 停止位置の視覚的フィードバック ▼▼▼
        if (stoppedAtIndex > 0 && stoppedAtIndex < currentQuestionFullText.length) {
            const preText = currentQuestionFullText.substring(0, stoppedAtIndex);
            const postText = currentQuestionFullText.substring(stoppedAtIndex);
            ui.questionText.innerHTML = `<span class="stopped-text-segment">${preText}</span>${postText}`;
        } else {
             // 停止しなかった場合や全文表示で止めた場合は、通常の全文テキストのまま (innerHTMLを使わない)
             // ただし、上記の全文表示処理でtextContentが既にセットされているので、ここは何もしなくても良いか、
             // 明示的にtextContentで再セットする。
             ui.questionText.textContent = currentQuestionFullText;
        }
        // ▲▲▲ 停止位置の視覚的フィードバック ▲▲▲

        ui.answerInput.disabled = true;
        ui.submitAnswer.disabled = true;
        ui.nextQuestion.style.display = 'inline-block';
        ui.resultArea.style.display = 'block';
        ui.nextQuestion.focus(); 
    }

    function handleDispute() {
        if (!lastAnswerWasInitiallyIncorrect) return; correctAnswers++; updateCorrectRateDisplay(); ui.resultText.textContent = '判定変更: 正解！ 🎉'; ui.resultText.className = 'correct'; ui.disputeButton.style.display = 'none'; lastAnswerWasInitiallyIncorrect = false;
    }
    
    // ▼▼▼ ヒントボタン処理関数 ▼▼▼
    function handleHintClick() {
        if (currentQuestionIndex < totalQuestions) {
            const correctAnswerReading = quizzes[currentQuestionIndex].readingAnswer;
            if (correctAnswerReading && correctAnswerReading.length > 0) {
                const firstChar = correctAnswerReading[0];
                const length = correctAnswerReading.length;
                ui.hintTextDisplay.textContent = `ヒント: 最初の文字は「${firstChar}」、全部で ${length} 文字です。`;
                ui.hintButton.disabled = true; // ヒントは1問につき1回まで
            }
        }
    }
    // ▲▲▲ ヒントボタン処理関数 ▲▲▲

    // Event Listeners
    ui.submitAnswer.addEventListener('click', checkAnswer);
    ui.answerInput.addEventListener('keypress', e => { if (e.key === 'Enter' && !ui.answerInput.disabled) checkAnswer(); });
    ui.nextQuestion.addEventListener('click', () => { currentQuestionIndex++; displayQuestion(); });
    ui.disputeButton.addEventListener('click', handleDispute);
    ui.stopSlowDisplayTextButton.addEventListener('click', stopProgressiveDisplayAndEnableInput);
    ui.hintButton.addEventListener('click', handleHintClick); // ▼▼▼ ヒントボタンリスナー追加 ▼▼▼


    ui.enableSlowDisplayTextCheckbox.addEventListener('change', () => {
        if (ui.enableSlowDisplayTextCheckbox.checked) {
            ui.speedControlArea.style.display = 'flex';
        } else {
            ui.speedControlArea.style.display = 'none';
            if (slowDisplayTextIntervalId) { 
                clearInterval(slowDisplayTextIntervalId);
                slowDisplayTextIntervalId = null;
                ui.questionText.textContent = currentQuestionFullText;
                ui.stopSlowDisplayTextButton.style.display = 'none';
                ui.answerInput.disabled = false;
                ui.submitAnswer.disabled = false;
                if (currentQuestionIndex < totalQuestions) ui.answerInput.focus(); // クイズ中ならフォーカス
            }
        }
    });

    ui.slowDisplayTextSpeedSlider.addEventListener('input', () => {
        const newSpeed = ui.slowDisplayTextSpeedSlider.value;
        ui.speedValueDisplay.textContent = `${newSpeed}ms`;
        if (slowDisplayTextIntervalId) { 
            startOrRestartSlowDisplayInterval(); 
        }
    });

    initializeQuiz(); 
});
