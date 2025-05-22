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
        correctRateText: document.getElementById('correctRateText') // 正答率表示用
    };

    // --- Configuration ---
    const CSV_FILE_PATH = 'みんはや問題リストv1.27 - 問題リスト.csv';
    /**
     * IMPORTANT: Adjust these column indices (0-based) to match your CSV file.
     * Based on the header "問題答え読み最終確認日" (assumed):
     * Column 1 (問題) -> QUESTION: 0
     * Column 2 (答え) -> DISPLAY_ANSWER: 1
     * Column 3 (読み) -> READING_ANSWER: 2
     */
    const COLUMN_INDICES = {
        QUESTION: 0,
        DISPLAY_ANSWER: 1,
        READING_ANSWER: 2
    };

    let quizzes = [];
    let currentQuestionIndex = 0;
    let totalQuestions = 0;
    let correctAnswers = 0;
    let questionsAttempted = 0;

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
            ui.correctRateText.textContent = '正答率: ---'; // 初期表示

            const response = await fetch(CSV_FILE_PATH);
            if (!response.ok) throw new Error(`CSVファイル読み込みエラー (${response.status}, ${response.statusText})`);
            
            let csvText = await response.text();
            // Remove BOM (Byte Order Mark) if present
            if (csvText.startsWith('\uFEFF')) csvText = csvText.substring(1);

            const lines = csvText.trim().split(/\r?\n/); // Handles CRLF and LF
            if (lines.length <= 1) throw new Error('CSVファイルにデータがありません (ヘッダー行のみ、または空)。');

            quizzes = lines
                .slice(1) // Skip the header row
                .map(line => {
                    const parts = line.split(',');
                    const question = parts[COLUMN_INDICES.QUESTION]?.trim();
                    const displayAnswer = parts[COLUMN_INDICES.DISPLAY_ANSWER]?.trim();
                    const readingAnswer = parts[COLUMN_INDICES.READING_ANSWER]?.trim();

                    if (question && readingAnswer) {
                        return {
                            question,
                            displayAnswer: displayAnswer || readingAnswer,
                            readingAnswer
                        };
                    }
                    return null;
                })
                .filter(quiz => quiz); 

            if (quizzes.length === 0) throw new Error('有効なクイズデータが見つかりませんでした。CSVの形式と列指定を確認してください。');
            
            shuffleArray(quizzes); 
            totalQuestions = quizzes.length;
            currentQuestionIndex = 0;
            correctAnswers = 0; // クイズデータロード時に統計リセット
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

    function displayQuestion() {
        ui.resultArea.style.display = 'none';
        ui.quizEndMessage.style.display = 'none';
        ui.questionText.classList.remove('fade-in');
        void ui.questionText.offsetWidth; 

        if (currentQuestionIndex < totalQuestions) {
            const currentQuiz = quizzes[currentQuestionIndex];
            ui.questionNumberText.textContent = `問題 ${currentQuestionIndex + 1} / ${totalQuestions}`;
            ui.questionText.textContent = currentQuiz.question;
            ui.answerInput.value = '';
            ui.answerInput.disabled = false;
            ui.submitAnswer.style.display = 'inline-block';
            ui.nextQuestion.style.display = 'none';
            ui.questionText.classList.add('fade-in');
            ui.answerInput.focus();
        } else {
            ui.quizArea.style.display = 'none';
            ui.resultArea.style.display = 'none';
            ui.quizEndMessage.style.display = 'block';
        }
    }

    function checkAnswer() {
        if (currentQuestionIndex >= totalQuestions) return;

        questionsAttempted++; 
        const userAnswer = ui.answerInput.value.trim();
        const currentQuiz = quizzes[currentQuestionIndex];
        const isCorrect = userAnswer === currentQuiz.readingAnswer;
        
        if (isCorrect) {
            correctAnswers++; 
        }
        
        let rate = 0;
        if (questionsAttempted > 0) {
            rate = Math.round((correctAnswers / questionsAttempted) * 100);
        }
        ui.correctRateText.textContent = `正答率: ${rate}%`;
        
        ui.resultText.textContent = isCorrect ? '正解！ 🎉' : '不正解... 😢';
        ui.resultText.className = isCorrect ? 'correct' : 'incorrect';
        
        let correctAnswerFormatted = `「${currentQuiz.readingAnswer}」`;
        if (currentQuiz.displayAnswer && currentQuiz.displayAnswer !== currentQuiz.readingAnswer) {
            correctAnswerFormatted = `「${currentQuiz.readingAnswer} (${currentQuiz.displayAnswer})」`;
        }
        ui.correctAnswerText.textContent = isCorrect ? '' : `正解は ${correctAnswerFormatted} です。`;
        
        ui.answerInput.disabled = true;
        ui.submitAnswer.style.display = 'none';
        ui.nextQuestion.style.display = 'inline-block';
        ui.resultArea.style.display = 'block';
        ui.nextQuestion.focus(); 
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

    // Initialize
    loadQuizData();
});
