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
        speedValueDisplay: document.getElementById('speedValueDisplay')
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

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function initializeQuiz() {
        const useSlowRead = window.confirm("問題文を徐々に表示させる機能を使用しますか？\n（この設定は後でチェックボックスから変更できます）");
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
            if (!response.ok) throw new Error(`CSVファイル読み込みエラー (${response.status}, ${response.statusText})`);
            
            let csvText = await response.text();
            if (csvText.startsWith('\uFEFF')) csvText = csvText.substring(1);

            const lines = csvText.trim().split(/\r?\n/);
            if (lines.length <= 1) throw new Error('CSVファイルにデータがありません (ヘッダー行のみ、または空)。');

            quizzes = lines
                .slice(1) // Skip the header row
                .map(line => {
                    const parts = line.split(',');
                    const question = parts[COLUMN_INDICES.QUESTION]?.trim();
                    const displayAnswer = parts[COLUMN_INDICES.DISPLAY_ANSWER]?.trim();
                    const readingAnswer = parts[COLUMN_INDICES.READING_ANSWER]?.trim();

                    if (question && readingAnswer) { // Question and reading are essential
                        return {
                            question,
                            displayAnswer: displayAnswer || readingAnswer, // Default displayAnswer to readingAnswer if empty
                            readingAnswer
                        };
                    }
                    return null; // Invalid row format
                })
                .filter(quiz => quiz); // Remove any null entries from invalid rows

            if (quizzes.length === 0) throw new Error('有効なクイズデータが見つかりませんでした。CSVの形式と列指定を確認してください。');
            
            shuffleArray(quizzes); 
            totalQuestions = quizzes.length;
            currentQuestionIndex = 0;
            correctAnswers = 0; 
            questionsAttempted = 0;

            ui.loadingMessage.style.display = 'none';
            ui.quizArea.style.display = 'block';
            displayQuestion();

        } catch (error) {
            console.error('クイズデータの読み込みまたは処理中にエラーが発生しました:', error);
            ui.loadingMessage.style.display = 'none';
            ui.errorMessage.textContent = `エラー: ${error.message}`;
            ui.errorMessage.style.display = 'block';
        }
    }
    
    function onSlowDisplayFinish() {
        if(slowDisplayTextIntervalId) clearInterval(slowDisplayTextIntervalId);
        slowDisplayTextIntervalId = null;
        // ui.questionText.textContent should already be full at this point
        ui.stopSlowDisplayTextButton.style.display = 'none';
        ui.answerInput.disabled = false;
        ui.submitAnswer.disabled = false;
        ui.answerInput.focus();
    }

    function stopProgressiveDisplayAndEnableInput() {
        if (slowDisplayTextIntervalId) {
            clearInterval(slowDisplayTextIntervalId);
            slowDisplayTextIntervalId = null;
        }
        // Question text remains as it is (partially displayed)
        ui.stopSlowDisplayTextButton.style.display = 'none';
        ui.answerInput.disabled = false;
        ui.submitAnswer.disabled = false;
        ui.answerInput.focus();
    }

    function displayQuestion() {
        ui.resultArea.style.display = 'none';
        ui.quizEndMessage.style.display = 'none';
        ui.questionText.classList.remove('fade-in'); // For re-triggering animation
        void ui.questionText.offsetWidth; // Force reflow
        ui.disputeButton.style.display = 'none';
        lastAnswerWasInitiallyIncorrect = false;

        // Clear any ongoing slow display
        if (slowDisplayTextIntervalId) {
            clearInterval(slowDisplayTextIntervalId);
            slowDisplayTextIntervalId = null;
        }
        ui.stopSlowDisplayTextButton.style.display = 'none'; // Ensure stop button is hidden initially

        if (currentQuestionIndex < totalQuestions) {
            const currentQuiz = quizzes[currentQuestionIndex];
            currentQuestionFullText = currentQuiz.question;
            currentDisplayedCharIndex = 0;
            ui.questionText.textContent = ''; // Clear previous question text

            ui.questionNumberText.textContent = `第${currentQuestionIndex + 1}問`;
            
            if (ui.enableSlowDisplayTextCheckbox.checked) {
                ui.answerInput.disabled = true;
                ui.submitAnswer.disabled = true;
                ui.stopSlowDisplayTextButton.style.display = 'block';
                const displaySpeedMs = parseInt(ui.slowDisplayTextSpeedSlider.value, 10);

                slowDisplayTextIntervalId = setInterval(() => {
                    if (currentDisplayedCharIndex < currentQuestionFullText.length) {
                        ui.questionText.textContent += currentQuestionFullText[currentDisplayedCharIndex];
                        currentDisplayedCharIndex++;
                    } else {
                        onSlowDisplayFinish(); // All characters displayed
                    }
                }, displaySpeedMs);
            } else { // Normal display (slow read not enabled)
                ui.questionText.textContent = currentQuestionFullText;
                ui.answerInput.disabled = false;
                ui.submitAnswer.disabled = false;
            }
            
            ui.answerInput.value = '';
            // Focus only if not in slow display mode or if slow display is already complete
            if (!ui.enableSlowDisplayTextCheckbox.checked || !slowDisplayTextIntervalId) {
                 ui.answerInput.focus();
            }
            ui.submitAnswer.style.display = 'inline-block'; // Submit button always visible initially
            ui.nextQuestion.style.display = 'none';
            ui.questionText.classList.add('fade-in');

        } else { // Quiz finished
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
        
        // If user answers (e.g., hits Enter) while slow display is active and hasn't pressed "Stop"
        // Stop the progressive display, keeping the currently displayed text
        if (slowDisplayTextIntervalId) {
            clearInterval(slowDisplayTextIntervalId);
            slowDisplayTextIntervalId = null;
            // ui.answerInput and ui.submitAnswer should already be enabled if user could submit,
            // but ensure they are for the rest of this function.
            // However, this path should ideally not be taken if inputs are correctly disabled during slow read.
            // The "stopProgressiveDisplayAndEnableInput" is for the explicit stop button.
            // For now, we assume inputs are enabled only AFTER slow display stops/completes.
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
        
        // After displaying the result, ensure the full question text is visible
        if (ui.questionText.textContent.length < currentQuestionFullText.length) {
            ui.questionText.textContent = currentQuestionFullText;
        }

        ui.answerInput.disabled = true;
        ui.submitAnswer.disabled = true; // Disable submit button after answer
        ui.nextQuestion.style.display = 'inline-block';
        ui.resultArea.style.display = 'block';
        ui.nextQuestion.focus(); 
    }

    function handleDispute() {
        if (!lastAnswerWasInitiallyIncorrect) return; // Only act if the last answer was marked incorrect
        correctAnswers++;
        updateCorrectRateDisplay();
        ui.resultText.textContent = '判定変更:🤡';
        ui.resultText.className = 'correct';
        ui.disputeButton.style.display = 'none';
        lastAnswerWasInitiallyIncorrect = false; // Reset flag
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
    
    ui.stopSlowDisplayTextButton.addEventListener('click', stopProgressiveDisplayAndEnableInput);

    ui.enableSlowDisplayTextCheckbox.addEventListener('change', () => {
        if (ui.enableSlowDisplayTextCheckbox.checked) {
            ui.speedControlArea.style.display = 'flex';
        } else {
            ui.speedControlArea.style.display = 'none';
            // If slow display was active and checkbox is unchecked, stop it and show full text
            if (slowDisplayTextIntervalId) {
                clearInterval(slowDisplayTextIntervalId);
                slowDisplayTextIntervalId = null;
                ui.questionText.textContent = currentQuestionFullText; // Show full text
                ui.stopSlowDisplayTextButton.style.display = 'none';
                ui.answerInput.disabled = false;
                ui.submitAnswer.disabled = false;
                ui.answerInput.focus();
            }
        }
    });

    ui.slowDisplayTextSpeedSlider.addEventListener('input', () => {
        ui.speedValueDisplay.textContent = `${ui.slowDisplayTextSpeedSlider.value}ms`;
        // Note: This changes the speed for the *next* slow display, not the current one if active.
    });

    // Initialize Quiz
    initializeQuiz(); 
});
