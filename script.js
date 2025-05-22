document.addEventListener('DOMContentLoaded', () => {
    const questionTextElement = document.getElementById('questionText');
    const answerInputElement = document.getElementById('answerInput');
    const submitAnswerButton = document.getElementById('submitAnswer');
    const resultTextElement = document.getElementById('resultText');
    const correctAnswerTextElement = document.getElementById('correctAnswerText');
    const nextQuestionButton = document.getElementById('nextQuestion');
    const loadingMessageElement = document.getElementById('loadingMessage');
    const errorMessageElement = document.getElementById('errorMessage');
    const quizAreaElement = document.getElementById('quizArea');
    const resultAreaElement = document.getElementById('resultArea');

    let quizzes = [];
    let currentQuestionIndex = 0;

    // CSVファイルを読み込んでクイズデータを準備
    async function loadQuizData() {
        try {
            // ユーザーがアップロードしたファイル名に合わせてください
            const response = await fetch('みんはや問題リストv1.27 - 問題リスト.csv');
            if (!response.ok) {
                throw new Error(`CSVファイルの読み込みに失敗しました: ${response.statusText}`);
            }
            const csvText = await response.text();
            
            // BOMの除去 (UTF-8のBOMがある場合)
            const cleanedCsvText = csvText.startsWith('\uFEFF') ? csvText.substring(1) : csvText;

            // PapaParseライブラリを使ってCSVをパースするのを推奨しますが、
            // 簡単な実装のため、ここでは単純なsplitで処理します。
            // 注意: この方法は複雑なCSV（カンマを含む値、改行を含む値など）には対応できません。
            const lines = cleanedCsvText.trim().split('\n');
            
            quizzes = lines.map(line => {
                const parts = line.split(','); // CSVの区切り文字がカンマの場合
                if (parts.length >= 2) {
                    return { question: parts[0].trim(), answer: parts[1].trim() };
                }
                return null; // 不正な形式の行はnullにする
            }).filter(quiz => quiz !== null && quiz.question && quiz.answer); // nullや不完全なデータを除外

            if (quizzes.length === 0) {
                throw new Error('有効なクイズデータが見つかりませんでした。CSVファイルの内容と形式を確認してください。');
            }

            loadingMessageElement.style.display = 'none';
            quizAreaElement.style.display = 'block';
            displayQuestion();

        } catch (error) {
            console.error('クイズデータの読み込みエラー:', error);
            loadingMessageElement.style.display = 'none';
            errorMessageElement.textContent = `エラー: ${error.message}`;
        }
    }

    // 問題を表示する関数
    function displayQuestion() {
        if (currentQuestionIndex < quizzes.length) {
            const currentQuiz = quizzes[currentQuestionIndex];
            questionTextElement.textContent = `問題: ${currentQuiz.question}`;
            answerInputElement.value = '';
            resultTextElement.textContent = '';
            correctAnswerTextElement.textContent = '';
            nextQuestionButton.style.display = 'none';
            submitAnswerButton.style.display = 'inline-block';
            answerInputElement.disabled = false;
            answerInputElement.focus();
        } else {
            questionTextElement.textContent = 'クイズはすべて終了しました！お疲れ様でした。';
            quizAreaElement.style.display = 'none'; // 入力エリアを隠す
            resultAreaElement.style.display = 'none'; // 結果エリアも隠す
        }
    }

    // 回答をチェックする関数
    function checkAnswer() {
        if (currentQuestionIndex >= quizzes.length) return;

        const userAnswer = answerInputElement.value.trim();
        const correctAnswer = quizzes[currentQuestionIndex].answer;

        // 全角・半角、大文字・小文字を区別しない比較 (必要に応じて調整)
        // const normalizedUserAnswer = userAnswer.toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        // const normalizedCorrectAnswer = correctAnswer.toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
        // if (normalizedUserAnswer === normalizedCorrectAnswer) {

        // シンプルな比較 (完全一致)
        if (userAnswer === correctAnswer) {
            resultTextElement.textContent = '正解！';
            resultTextElement.style.color = 'green';
        } else {
            resultTextElement.textContent = '不正解...';
            resultTextElement.style.color = 'red';
            correctAnswerTextElement.textContent = `正解は「${correctAnswer}」です。`;
        }

        submitAnswerButton.style.display = 'none';
        answerInputElement.disabled = true;
        nextQuestionButton.style.display = 'inline-block';
        resultAreaElement.style.display = 'block'; // 結果エリアを表示
    }

    // イベントリスナーを設定
    submitAnswerButton.addEventListener('click', checkAnswer);
    answerInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            checkAnswer();
        }
    });

    nextQuestionButton.addEventListener('click', () => {
        currentQuestionIndex++;
        displayQuestion();
    });

    // 初期化
    loadQuizData();
});
