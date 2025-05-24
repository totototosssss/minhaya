document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得 (HTMLのidに合わせて調整)
    const messageTextElement = document.getElementById('message-text');
    const choicesAreaElement = document.getElementById('choices-area');
    const feedbackTextElement = document.getElementById('feedback-text');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const quizAreaElement = document.getElementById('quiz-area');
    const resultAreaElement = document.getElementById('result-area');
    // const scoreElement = document.getElementById('score'); // result-card内の新しい要素で表示
    // const totalQuestionsElement = document.getElementById('total-questions'); // 同上
    const restartBtn = document.getElementById('restart-btn');
    const progressBarElement = document.getElementById('progress-bar');
    const progressTextElement = document.getElementById('progress-text');
    // const scorePercentageElement = document.getElementById('score-percentage'); // 不要なら削除

    // 結果表示用
    const resultIconContainer = document.getElementById('result-icon-container');
    const resultRankTitleElement = document.getElementById('result-rank-title');
    const finalScoreValueElement = document.getElementById('final-score-value');
    const totalQuestionsOnResultElement = document.getElementById('total-questions-on-result');
    const resultMessageElement = document.getElementById('result-message');
    
    // const confettiCanvas = document.getElementById('confetti-canvas'); // HTMLにcanvasタグを追加

    let allQuizData = []; // 全てのロードされたクイズデータ
    let currentQuizSet = []; // 現在の10問（またはそれ以下）のセット
    let currentQuestionIndex = 0;
    let score = 0;
    const TARGET_NUM_QUESTIONS = 10; // 目標問題数

    async function loadQuizData() {
        try {
            const response = await fetch('quiz_data.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allQuizData = await response.json(); // まず全データ読み込み
            
            if (allQuizData.length === 0) {
                displayError("クイズデータがありません。txtファイルから問題が生成されなかったようです。");
                return;
            }
            prepareNewQuizSet(); // 最初のクイズセットを準備
            startGame();
        } catch (error) {
            console.error("クイズデータの読み込みに失敗:", error);
            displayError("クイズデータの読み込みに失敗しました。ファイルを確認してください。");
        }
    }

    function prepareNewQuizSet() {
        let shuffledData = shuffleArray([...allQuizData]); // 全データからシャッフルしてコピー
        currentQuizSet = shuffledData.slice(0, TARGET_NUM_QUESTIONS); // 10問をスライス
        if (currentQuizSet.length === 0 && allQuizData.length > 0) {
            // フィルターなどで10問に満たなくても、元データがあれば少なくとも1問は出題試みる
             currentQuizSet = shuffledData.slice(0, allQuizData.length); 
        }
    }
    
    function displayError(message) { /* 前回同様 */ }

    function startGame() {
        currentQuestionIndex = 0;
        score = 0;
        
        // アニメーションリセットのため、一度非表示にしてから表示
        resultAreaElement.style.display = 'none';
        const resultCard = document.querySelector('.result-card');
        if(resultCard) {
            resultCard.style.opacity = '0';
            resultCard.style.transform = 'translateY(20px)';
        }
        
        quizAreaElement.style.display = 'block';
        nextQuestionBtn.style.display = 'none';
        feedbackTextElement.textContent = '';
        feedbackTextElement.className = 'feedback-text'; 
        
        if (currentQuizSet.length === 0) {
            displayError("出題できるクイズがありません。");
            return;
        }
        
        updateProgress();
        displayQuestion();
    }

    function displayQuestion() {
        if (currentQuestionIndex < currentQuizSet.length) {
            const currentQuestion = currentQuizSet[currentQuestionIndex];
            messageTextElement.innerHTML = currentQuestion.message.replace(/\n/g, '<br>');
            choicesAreaElement.innerHTML = ''; 

            currentQuestion.choices.forEach(choice => {
                const button = document.createElement('button');
                button.textContent = choice;
                button.addEventListener('click', () => handleAnswer(choice, currentQuestion.answer));
                choicesAreaElement.appendChild(button);
            });
            feedbackTextElement.textContent = '';
            feedbackTextElement.className = 'feedback-text';
            nextQuestionBtn.style.display = 'none';
        } else {
            showResults();
        }
    }

    function handleAnswer(selectedChoice, correctAnswer) { /* 前回同様のロジック、紙吹雪もOK */
        const buttons = choicesAreaElement.getElementsByTagName('button');
        let selectedButtonElement = null;

        for (let btn of buttons) {
            btn.disabled = true;
            if (btn.textContent === selectedChoice) selectedButtonElement = btn;
            if (btn.textContent === correctAnswer) btn.classList.add('reveal-correct');
        }

        if (selectedChoice === correctAnswer) {
            score++;
            feedbackTextElement.textContent = "正解！🎉";
            feedbackTextElement.className = 'feedback-text correct';
            if (selectedButtonElement) {
                selectedButtonElement.classList.remove('reveal-correct');
                selectedButtonElement.classList.add('correct');
            }
            if (typeof confetti === 'function') {
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
            }
        } else {
            feedbackTextElement.textContent = `残念！正解は「${correctAnswer}」でした。`;
            feedbackTextElement.className = 'feedback-text wrong';
            if (selectedButtonElement) selectedButtonElement.classList.add('wrong');
        }
        nextQuestionBtn.style.display = 'inline-flex';
    }

    function updateProgress() {
        const totalQuestionsInSet = currentQuizSet.length;
        if (totalQuestionsInSet > 0) {
            // currentQuestionIndex は 0 から始まるので、表示上は +1 する
            // プログレスバーは完了度合いなので、次の問題に進むときに更新するのが自然
            // 最初の問題表示時は (0 / total) * 100 = 0% から始まる
            // 最後の問題回答後は (total / total) * 100 = 100%
            const completedPercentage = (currentQuestionIndex / totalQuestionsInSet) * 100;
            progressBarElement.style.width = `${completedPercentage}%`;
            progressTextElement.textContent = `問題 ${currentQuestionIndex + 1} / ${totalQuestionsInSet}`;
        } else {
            progressBarElement.style.width = `0%`;
            progressTextElement.textContent = `問題 - / -`;
        }
    }

    function showResults() {
        quizAreaElement.style.display = 'none';
        resultAreaElement.style.display = 'block';
        
        const totalAnswered = currentQuizSet.length;
        totalQuestionsOnResultElement.textContent = totalAnswered;

        // スコアに応じた称号とメッセージ、アイコン
        let rank = '';
        let rankTitle = '';
        let message = '';
        let iconClass = '';

        const percentage = totalAnswered > 0 ? (score / totalAnswered) * 100 : 0;

        if (score === totalAnswered && totalAnswered > 0) { // パーフェクト
            rank = 's';
            rankTitle = "トーク神認定！";
            message = "中毒お疲れ🤡";
            iconClass = 'fas fa-trophy';
            if (typeof confetti === 'function') { // 豪華な紙吹雪
                setTimeout(() => { // カード表示アニメーションと被らないように少し遅延
                     confetti({ particleCount: 250, spread: 180, origin: { y: 0.3 }, zIndex: 10000 });
                }, 600);
            }
        } else if (percentage >= 80) {
            rank = 'a';
            rankTitle = "トークマスター";
            message = "素晴らしい！ほとんどの発言を見抜きましたね！";
            iconClass = 'fas fa-medal';
        } else if (percentage >= 60) {
            rank = 'b';
            rankTitle = "トークエキスパート";
            message = "なかなかの洞察力！もっと上を目指しましょう！";
            iconClass = 'fas fa-star';
        } else if (percentage >= 40) {
            rank = 'c';
            rankTitle = "トークチャレンジャー";
            message = "いい線いってます！次はもっと多くの正解を！";
            iconClass = 'fas fa-face-smile-beam';
        } else if (percentage >= 20) {
            rank = 'd';
            rankTitle = "トーク見習い";
            message = "まだ伸びしろ十分！再挑戦で感覚を掴もう！";
            iconClass = 'fas fa-face-meh';
        } else {
            rank = 'f';
            rankTitle = "トークのたまご";
            message = "残念！めげずにもう一度トライしてみよう！";
            iconClass = 'fas fa-face-sad-tear';
        }
        
        resultIconContainer.className = `result-icon-container rank-${rank}`; // アイコンの色分け用
        resultIconContainer.innerHTML = `<i class="${iconClass}"></i>`;
        resultRankTitleElement.textContent = rankTitle;
        resultRankTitleElement.className = `result-rank-title rank-${rank}`;
        resultMessageElement.textContent = message;

        // スコアカウントアップアニメーション
        animateValue(finalScoreValueElement, 0, score, 800);

        progressBarElement.style.width = '100%';
        progressTextElement.textContent = `全 ${totalAnswered} 問完了！`;
    }
    
    function animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            element.textContent = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }


    function shuffleArray(array) { /* 前回同様 */ }
    document.getElementById('current-year').textContent = new Date().getFullYear();

    nextQuestionBtn.addEventListener('click', () => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuizSet.length) {
            displayQuestion();
            updateProgress(); 
        } else {
            // 最後の問題のプログレスバーを100%にする
            progressBarElement.style.width = '100%';
            progressTextElement.textContent = `結果を計算中...`; // or `全 ${currentQuizSet.length} 問完了！`
            showResults();
        }
    });

    restartBtn.addEventListener('click', () => {
        prepareNewQuizSet(); // 新しい10問セットを準備
        startGame();
    });
    
    loadQuizData();
});
