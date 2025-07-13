// DOM Elements
const registrationSection = document.getElementById('registration-section');
const interviewSection = document.getElementById('interview-section');
const resultsSection = document.getElementById('results-section');
const registrationForm = document.getElementById('registration-form');
const chatMessages = document.getElementById('chat-messages');
const voiceBtn = document.getElementById('voice-btn');
const voiceStatus = document.getElementById('voice-status');
const endInterviewBtn = document.getElementById('end-interview-btn');
const progressBar = document.getElementById('progress-bar');
const questionCounter = document.getElementById('question-counter');
const timer = document.getElementById('timer');
const cameraFeed = document.getElementById('camera-feed');
const warningAlert = document.querySelector('.warning-alert');
const warningMessage = document.getElementById('warning-message');
const hrName = document.getElementById('hr-name');
const submitText = document.getElementById('submit-text');
const submitLoading = document.getElementById('submit-loading');

// AI Configuration
const AI_NAME = "Priya Sharma";
const AI_POSITION = "Senior HR Manager";
const AI_AVATAR = "PS";

// Interview State
let interviewState = {
    candidate: {},
    currentQuestions: [],
    currentQuestionIndex: 0,
    answers: [],
    startTime: null,
    timerInterval: null,
    recognition: null,
    isSpeaking: false,
    cheatingWarnings: 0,
    isTabActive: true,
    questionCount: 5,
    isInterviewStarted: false,
    femaleVoice: null,
    textInputFallback: false,
    isMCQ: false,
    currentMCQOptions: []
};

// Initialize the application
function init() {
    setupEventListeners();
    checkCameraAccess();
    setupTabMonitoring();
    initializeSpeechRecognition();
    loadVoices();
}

// Load voices for text-to-speech
function loadVoices() {
    // This is needed for some browsers to populate voices
    window.speechSynthesis.onvoiceschanged = function() {
        const voices = window.speechSynthesis.getVoices();
        interviewState.femaleVoice = voices.find(voice => 
            voice.name.includes('Female') || 
            voice.name.includes('Woman') ||
            voice.lang.includes('en-IN') ||
            voice.name.toLowerCase().includes('priya') ||
            voice.name.toLowerCase().includes('neha')
        );
    };
    
    // Some browsers don't support onvoiceschanged
    const voices = window.speechSynthesis.getVoices();
    interviewState.femaleVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Woman') ||
        voice.lang.includes('en-IN') ||
        voice.name.toLowerCase().includes('priya') ||
        voice.name.toLowerCase().includes('neha')
    );
}

// Set up event listeners
function setupEventListeners() {
    registrationForm.addEventListener('submit', handleRegistrationSubmit);
    
    // Voice button events
    voiceBtn.addEventListener('click', handleVoiceButtonClick);
    
    endInterviewBtn.addEventListener('click', endInterview);
    document.getElementById('download-report').addEventListener('click', generateAndDownloadReport);
}

// Handle registration form submission
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    
    // Show loading state
    submitText.style.display = 'none';
    submitLoading.style.display = 'inline';
    
    interviewState.candidate = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value,
        experience: document.getElementById('experience').value
    };
    
    interviewState.questionCount = parseInt(document.getElementById('question-count').value);
    
    registrationSection.style.display = 'none';
    interviewSection.style.display = 'block';
    
    // Show loading state while generating questions
    displayAIMessage("Thank you for your information. I'm preparing your interview questions...", true);
    
    // Generate questions based on role and experience
    await generateInterviewQuestions();
    
    startInterview();
    
    // Reset button state
    submitText.style.display = 'inline';
    submitLoading.style.display = 'none';
}

// Generate interview questions with diverse topics
async function generateInterviewQuestions() {
    const role = interviewState.candidate.role;
    const experience = interviewState.candidate.experience;
    const questionCount = interviewState.questionCount;
    
    // Fallback questions if API fails
    const fallbackQuestions = getFallbackQuestions(role, questionCount);
    
    try {
        const prompt = `Generate ${questionCount} diverse interview questions for a ${experience} candidate applying for ${role} position.
        Include:
        - 30% Multiple Choice Questions (with 4 options and correct answer marked)
        - 30% Technical questions
        - 20% Behavioral questions
        - 20% Situational questions
        
        Format as JSON array with:
        - question (text)
        - type (mcq, technical, behavioral, or situational)
        - difficulty (easy, medium, hard)
        - options (array for MCQ)
        - correctAnswer (index for MCQ)
        - keywords (important concepts)
        - sampleAnswer (ideal response)
        
        Example:
        [
            {
                "question": "What is the purpose of closures in JavaScript?",
                "type": "mcq",
                "difficulty": "medium",
                "options": [
                    "To create private variables",
                    "To improve performance",
                    "To make code more readable",
                    "To reduce memory usage"
                ],
                "correctAnswer": 0,
                "keywords": ["JavaScript", "closures"],
                "sampleAnswer": "Closures are primarily used to create private variables and maintain state in JavaScript functions."
            }
        ]`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA0dr_zXm5Bl-Vr1gizLi4tFBpekPpO3wA`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0].content.parts[0].text) {
            throw new Error('Invalid API response format');
        }
        
        const responseText = data.candidates[0].content.parts[0].text;
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('Could not extract JSON from response');
        }
        
        const jsonString = responseText.slice(jsonStart, jsonEnd);
        interviewState.currentQuestions = JSON.parse(jsonString);
        
    } catch (error) {
        console.error('Error generating questions:', error);
        interviewState.currentQuestions = fallbackQuestions;
        displayAIMessage("Using carefully selected questions for this interview.", false);
    }
}

// Start the interview
function startInterview() {
    interviewState.startTime = new Date();
    startTimer();
    displayWelcomeMessage();
    interviewState.isInterviewStarted = true;
}

// Display welcome message from AI
function displayWelcomeMessage() {
    const welcomeMessage = `
    <div class="d-flex mb-3">
        <div class="flex-shrink-0 me-3">
            <div class="hr-avatar">${AI_AVATAR}</div>
        </div>
        <div class="ai-message p-3">
            <strong>${AI_NAME} (${AI_POSITION}):</strong> Hello ${interviewState.candidate.name}! Welcome to your interview for the ${interviewState.candidate.role} position. 
            <br><br>
            This will be a conversational interview with a mix of multiple choice and open-ended questions. For MCQs, you can say the option number (1, 2, 3, or 4) or the option text. For other questions, you can speak or type your response.
            <br><br>
            Let's begin with your introduction - please tell me about your professional journey and what excites you about this opportunity.
        </div>
    </div>
    `;
    
    chatMessages.innerHTML += welcomeMessage;
    scrollToBottom();
    
    const welcomeSpeech = `Hello ${interviewState.candidate.name}! Welcome to your interview for the ${interviewState.candidate.role} position. 
    This will be a conversational interview with a mix of multiple choice and open-ended questions.
    For multiple choice questions, say the option number or the option text.
    Let's begin with your introduction - please tell me about your professional journey and what excites you about this opportunity.`;
    
    speak(welcomeSpeech);
}

// Ask the current question
function askQuestion() {
    if (interviewState.currentQuestionIndex >= interviewState.currentQuestions.length) {
        endInterview();
        return;
    }
    
    const currentQuestion = interviewState.currentQuestions[interviewState.currentQuestionIndex];
    interviewState.isMCQ = currentQuestion.type === 'mcq';
    interviewState.currentMCQOptions = currentQuestion.options || [];
    
    // Update progress
    const progress = ((interviewState.currentQuestionIndex) / interviewState.currentQuestions.length) * 100;
    progressBar.style.width = `${progress}%`;
    questionCounter.textContent = `Question ${interviewState.currentQuestionIndex + 1} of ${interviewState.currentQuestions.length}`;
    
    let questionHtml = `
    <div class="d-flex mb-3">
        <div class="flex-shrink-0 me-3">
            <div class="hr-avatar">${AI_AVATAR}</div>
        </div>
        <div class="ai-message p-3">
            <strong>${AI_NAME}:</strong> ${currentQuestion.question} 
            <span class="badge float-end difficulty-${currentQuestion.difficulty}">${currentQuestion.difficulty}</span>
            <span class="badge float-end me-2 type-${currentQuestion.type}">${currentQuestion.type}</span>
    `;
    
    // Add MCQ options if available
    if (interviewState.isMCQ && currentQuestion.options) {
        questionHtml += `
            <div class="mt-3">
                ${currentQuestion.options.map((option, index) => `
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="mcq-${interviewState.currentQuestionIndex}" id="option-${index}" value="${index}">
                    <label class="form-check-label" for="option-${index}">${String.fromCharCode(65 + index)}. ${option}</label>
                </div>
                `).join('')}
            </div>
        `;
    }
    
    questionHtml += `
        </div>
    </div>
    `;
    
    chatMessages.innerHTML += questionHtml;
    scrollToBottom();
    
    // Add answer input area for non-MCQ questions
    if (!interviewState.isMCQ) {
        const answerInputId = `answer-input-${interviewState.currentQuestionIndex}`;
        chatMessages.innerHTML += `
        <div class="answer-input mb-3">
            <div class="input-group">
                <textarea id="${answerInputId}" class="form-control" rows="3" placeholder="Type your answer here..."></textarea>
                <button class="btn btn-primary submit-answer" data-question-index="${interviewState.currentQuestionIndex}">Submit</button>
            </div>
        </div>
        `;
        
        // Add event listener for the submit button
        document.querySelector(`.submit-answer[data-question-index="${interviewState.currentQuestionIndex}"]`).addEventListener('click', handleTextAnswerSubmit);
    }
    
    // Update voice button text based on question type
    if (interviewState.isMCQ) {
        voiceBtn.innerHTML = '<i class="bi bi-mic-fill me-2"></i> Speak Answer (1-4 or option text)';
        voiceStatus.textContent = "Say the option number (1, 2, 3, or 4) or the option text";
    } else {
        voiceBtn.innerHTML = '<i class="bi bi-mic-fill me-2"></i> Speak Answer';
        voiceStatus.textContent = "Click the button and speak your answer";
    }
    
    // Speak the question
    speakQuestion(currentQuestion);
}

// Speak question with options if MCQ
function speakQuestion(question) {
    let questionText = question.question;
    
    if (question.type === 'mcq' && question.options) {
        questionText += " Options are: ";
        question.options.forEach((option, index) => {
            questionText += `Option ${index + 1}: ${option}. `;
        });
    }
    
    speak(questionText);
}

// Handle MCQ answer selection
function handleMCQAnswer(selectedOption) {
    const currentQuestion = interviewState.currentQuestions[interviewState.currentQuestionIndex];
    const options = currentQuestion.options || [];
    
    // Try to parse as number (1-4)
    let selectedIndex = parseInt(selectedOption) - 1;
    
    // If not a number, try to match option text
    if (isNaN(selectedIndex)) {
        selectedIndex = options.findIndex(opt => 
            opt.toLowerCase().includes(selectedOption.toLowerCase()) ||
            selectedOption.toLowerCase().includes(opt.toLowerCase())
        );
    }
    
    // Validate selection
    if (selectedIndex < 0 || selectedIndex >= options.length) {
        displayAIMessage(`I didn't understand your selection. Please say the option number (1 to ${options.length}) or the option text.`);
        return;
    }
    
    // Store answer
    interviewState.answers.push({
        question: currentQuestion.question,
        answer: options[selectedIndex],
        isCorrect: selectedIndex === currentQuestion.correctAnswer,
        type: currentQuestion.type,
        difficulty: currentQuestion.difficulty,
        correctAnswer: options[currentQuestion.correctAnswer]
    });
    
    // Display feedback immediately for MCQ
    const feedback = selectedIndex === currentQuestion.correctAnswer 
        ? "Correct! " + (currentQuestion.sampleAnswer || "")
        : `Incorrect. The correct answer was: ${options[currentQuestion.correctAnswer]}. ${currentQuestion.sampleAnswer || ""}`;
    
    const feedbackHtml = `
    <div class="d-flex mb-3">
        <div class="flex-shrink-0 me-3">
            <div class="hr-avatar">${AI_AVATAR}</div>
        </div>
        <div class="ai-message p-3">
            <strong>${AI_NAME}:</strong> ${feedback}
        </div>
    </div>
    `;
    
    chatMessages.innerHTML += feedbackHtml;
    scrollToBottom();
    speak(feedback);
    
    // Move to next question
    interviewState.currentQuestionIndex++;
    if (interviewState.currentQuestionIndex < interviewState.currentQuestions.length) {
        setTimeout(() => askQuestion(), 2000);
    } else {
        endInterview();
    }
}

// Handle text answer submission
function handleTextAnswerSubmit(e) {
    const questionIndex = parseInt(e.target.getAttribute('data-question-index'));
    const answerInput = document.getElementById(`answer-input-${questionIndex}`);
    const answer = answerInput.value.trim();
    
    if (!answer) {
        alert("Please enter your answer before submitting.");
        return;
    }
    
    // Remove the input area
    e.target.closest('.answer-input').remove();
    
    // Display user's answer
    displayUserMessage(answer);
    
    // Evaluate the answer
    evaluateAnswer(answer);
}

// Evaluate answer
async function evaluateAnswer(answer) {
    const currentQuestion = interviewState.currentQuestions[interviewState.currentQuestionIndex];
    
    // Show evaluation in progress
    const evaluationId = 'eval-' + Date.now();
    chatMessages.innerHTML += `
    <div class="d-flex mb-3">
        <div class="flex-shrink-0 me-3">
            <div class="hr-avatar">${AI_AVATAR}</div>
        </div>
        <div class="ai-message p-3" id="${evaluationId}">
            <span class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> Analyzing your response...</span>
        </div>
    </div>
    `;
    scrollToBottom();
    
    try {
        // Calculate a score based on answer length and keywords
        let score = Math.min(100, Math.floor(answer.length / 3));
        if (currentQuestion.keywords) {
            const keywordMatches = currentQuestion.keywords.filter(keyword => 
                answer.toLowerCase().includes(keyword.toLowerCase())
            ).length;
            score = Math.min(100, score + (keywordMatches * 10));
        }
        
        // Generate feedback based on score and content
        let feedback = "";
        let strengths = [];
        let improvements = [];
        
        if (score >= 80) {
            feedback = "Excellent response! You provided a comprehensive answer that addressed the question thoroughly.";
            strengths = ["Detailed explanation", "Relevant examples", "Clear communication"];
            improvements = ["Consider adding more technical depth", "Could mention alternative approaches"];
        } else if (score >= 60) {
            feedback = "Good response. You covered the main points well.";
            strengths = ["Clear structure", "Relevant experience"];
            improvements = ["Could provide more specific examples", "Consider expanding on technical aspects"];
        } else {
            feedback = "Thank you for your answer. Let me provide some suggestions for improvement.";
            strengths = ["Willingness to engage", "Attempt to address question"];
            improvements = ["Try to provide more detailed responses", "Consider structuring your answer more clearly", "Include specific examples from your experience"];
        }
        
        // Add specific feedback based on question type
        if (currentQuestion.type === 'technical') {
            improvements.push("Consider discussing implementation details");
        } else if (currentQuestion.type === 'behavioral') {
            improvements.push("Try using the STAR method (Situation, Task, Action, Result)");
        }
        
        const evaluation = {
            score: score,
            feedback: feedback,
            strengths: strengths,
            areasForImprovement: improvements
        };
        
        // Store answer with evaluation
        interviewState.answers.push({
            question: currentQuestion.question,
            answer: answer,
            evaluation: evaluation,
            type: currentQuestion.type,
            difficulty: currentQuestion.difficulty
        });
        
        // Display evaluation
        const feedbackHtml = `
        <strong>${AI_NAME}:</strong> ${evaluation.feedback}
        <div class="mt-2">
            <strong>Score:</strong> ${evaluation.score}/100
        </div>
        <div class="mt-2">
            <strong>Strengths:</strong> ${evaluation.strengths.join(', ')}
        </div>
        <div class="mt-1">
            <strong>Suggestions:</strong> ${evaluation.areasForImprovement.join(', ')}
        </div>
        `;
        
        document.getElementById(evaluationId).innerHTML = feedbackHtml;
        scrollToBottom();
        speak(evaluation.feedback);
        
        // Move to next question
        interviewState.currentQuestionIndex++;
        if (interviewState.currentQuestionIndex < interviewState.currentQuestions.length) {
            setTimeout(() => askQuestion(), 3000);
        } else {
            endInterview();
        }
        
    } catch (error) {
        console.error('Error evaluating answer:', error);
        document.getElementById(evaluationId).innerHTML = `<strong>${AI_NAME}:</strong> Thank you for your answer. Let's continue with the next question.`;
        
        // Store answer without evaluation
        interviewState.answers.push({
            question: currentQuestion.question,
            answer: answer,
            evaluation: null,
            type: currentQuestion.type,
            difficulty: currentQuestion.difficulty
        });
        
        // Move to next question
        interviewState.currentQuestionIndex++;
        if (interviewState.currentQuestionIndex < interviewState.currentQuestions.length) {
            setTimeout(() => askQuestion(), 2000);
        } else {
            endInterview();
        }
    }
}

// Initialize speech recognition with error handling
function initializeSpeechRecognition() {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            showVoiceRecognitionError("Voice recognition not supported in your browser. Please use Chrome or Edge.");
            return;
        }
        
        interviewState.recognition = new SpeechRecognition();
        interviewState.recognition.continuous = false;
        interviewState.recognition.interimResults = false;
        interviewState.recognition.lang = 'en-US';
        
        interviewState.recognition.onresult = (event) => {
            if (event.results && event.results.length > 0) {
                const transcript = event.results[0][0].transcript.trim();
                
                if (interviewState.isMCQ) {
                    // Handle MCQ answer by voice
                    handleMCQAnswer(transcript);
                } else {
                    // Handle regular answer by voice
                    displayUserMessage(transcript);
                    evaluateAnswer(transcript);
                }
            }
            resetVoiceButton();
        };
        
        interviewState.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = "Voice recognition error. Please try again.";
            
            switch(event.error) {
                case 'network':
                    errorMessage = "Network error occurred. Please check your internet connection.";
                    break;
                case 'not-allowed':
                    errorMessage = "Microphone access denied. Please allow microphone permissions.";
                    break;
                case 'service-not-allowed':
                    errorMessage = "Browser doesn't have permission to use microphone.";
                    break;
            }
            
            showVoiceRecognitionError(errorMessage);
            resetVoiceButton();
        };
        
        interviewState.recognition.onend = () => {
            if (!interviewState.isSpeaking) {
                resetVoiceButton();
            }
        };
        
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        showVoiceRecognitionError("Failed to initialize voice recognition. Please refresh the page.");
    }
}

// Show error message and provide fallback
function showVoiceRecognitionError(message) {
    voiceStatus.textContent = message;
    voiceStatus.style.color = "#dc3545";
    
    // Show text input fallback
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group mt-3';
    inputGroup.innerHTML = `
        <input type="text" id="text-fallback-input" class="form-control" placeholder="Type your answer here...">
        <button id="text-fallback-submit" class="btn btn-primary">Submit</button>
    `;
    
    voiceStatus.after(inputGroup);
    
    document.getElementById('text-fallback-submit').addEventListener('click', () => {
        const answer = document.getElementById('text-fallback-input').value.trim();
        if (answer) {
            if (interviewState.isMCQ) {
                handleMCQAnswer(answer);
            } else {
                displayUserMessage(answer);
                evaluateAnswer(answer);
            }
            inputGroup.remove();
            resetVoiceButton();
        }
    });
}

// Handle voice button click with network awareness
function handleVoiceButtonClick() {
    if (!interviewState.isInterviewStarted) return;
    
    // Check online status
    if (!navigator.onLine) {
        showVoiceRecognitionError("You appear to be offline. Voice recognition requires internet connection.");
        return;
    }
    
    if (interviewState.isSpeaking) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}

// Start voice recording with permissions check
function startVoiceRecording() {
    // Check microphone permissions first
    navigator.permissions.query({name: 'microphone'}).then(permissionStatus => {
        if (permissionStatus.state === 'denied') {
            showVoiceRecognitionError("Microphone access blocked. Please enable it in browser settings.");
            return;
        }
        
        try {
            interviewState.recognition.start();
            interviewState.isSpeaking = true;
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="bi bi-mic-fill me-2"></i> Listening...';
            voiceStatus.textContent = "Speak now...";
            voiceStatus.style.color = "var(--primary-color)";
        } catch (err) {
            console.error('Error starting recognition:', err);
            showVoiceRecognitionError("Error accessing microphone. Please ensure it's connected and try again.");
        }
    }).catch(err => {
        console.error('Permission query error:', err);
        // Proceed with attempt if permission query fails
        try {
            interviewState.recognition.start();
            interviewState.isSpeaking = true;
            voiceBtn.classList.add('listening');
            voiceBtn.innerHTML = '<i class="bi bi-mic-fill me-2"></i> Listening...';
            voiceStatus.textContent = "Speak now...";
            voiceStatus.style.color = "var(--primary-color)";
        } catch (err) {
            console.error('Error starting recognition:', err);
            showVoiceRecognitionError("Error accessing microphone. Please ensure it's connected and try again.");
        }
    });
}

// Stop voice recording
function stopVoiceRecording() {
    interviewState.isSpeaking = false;
    try {
        interviewState.recognition.stop();
    } catch (err) {
        console.error('Error stopping recognition:', err);
    }
    resetVoiceButton();
}

// Reset voice button to initial state
function resetVoiceButton() {
    interviewState.isSpeaking = false;
    voiceBtn.classList.remove('listening');
    
    if (interviewState.isMCQ) {
        voiceBtn.innerHTML = '<i class="bi bi-mic-fill me-2"></i> Speak Answer (1-4 or option text)';
        voiceStatus.textContent = "Say the option number (1, 2, 3, or 4) or the option text";
    } else {
        voiceBtn.innerHTML = '<i class="bi bi-mic-fill me-2"></i> Speak Answer';
        voiceStatus.textContent = "Click the button and speak your answer";
    }
    
    voiceStatus.style.color = "var(--text-color)";
}

// Text-to-speech with female voice
function speak(text) {
    if ('speechSynthesis' in window) {
        // Cancel any previous speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Use female voice if available
        if (interviewState.femaleVoice) {
            utterance.voice = interviewState.femaleVoice;
        } else {
            // Fallback: try to find any female voice
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(voice => 
                voice.name.includes('Female') || 
                voice.name.includes('Woman') ||
                voice.lang.includes('en-IN')
            );
            
            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }
        }
        
        // Configure voice properties
        utterance.rate = 1.1;
        utterance.pitch = 1.1;
        utterance.volume = 1;
        
        window.speechSynthesis.speak(utterance);
    }
}

// End the interview
function endInterview() {
    clearInterval(interviewState.timerInterval);
    
    if (interviewState.recognition) {
        interviewState.recognition.stop();
    }
    
    // Calculate score
    let totalScore = 0;
    let scoredAnswers = 0;
    let typeCounts = { mcq: 0, technical: 0, behavioral: 0, situational: 0 };
    let typeScores = { mcq: 0, technical: 0, behavioral: 0, situational: 0 };
    let difficultyCounts = { easy: 0, medium: 0, hard: 0 };
    let difficultyScores = { easy: 0, medium: 0, hard: 0 };
    let correctMCQs = 0;
    let totalMCQs = 0;
    
    interviewState.answers.forEach(answer => {
        if (answer.type === 'mcq') {
            totalMCQs++;
            if (answer.isCorrect) correctMCQs++;
        }
        
        if (answer.evaluation?.score) {
            totalScore += answer.evaluation.score;
            scoredAnswers++;
            
            // Track by type
            typeCounts[answer.type]++;
            typeScores[answer.type] += answer.evaluation.score;
            
            // Track by difficulty
            difficultyCounts[answer.difficulty]++;
            difficultyScores[answer.difficulty] += answer.evaluation.score;
        }
    });
    
    const averageScore = scoredAnswers > 0 ? Math.round(totalScore / scoredAnswers) : 0;
    const mcqAccuracy = totalMCQs > 0 ? Math.round((correctMCQs / totalMCQs) * 100) : 0;
    
    // Calculate duration
    const endTime = new Date();
    const duration = Math.floor((endTime - interviewState.startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Display results
    interviewSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Populate candidate info
    document.getElementById('result-name').textContent = interviewState.candidate.name;
    document.getElementById('result-email').textContent = interviewState.candidate.email;
    document.getElementById('result-role').textContent = interviewState.candidate.role;
    document.getElementById('result-experience').textContent = interviewState.candidate.experience;
    
    // Populate interview summary
    document.getElementById('total-questions').textContent = interviewState.answers.length;
    document.getElementById('overall-score').textContent = `${averageScore}%`;
    document.getElementById('mcq-accuracy').textContent = `${mcqAccuracy}%`;
    document.getElementById('interview-duration').textContent = durationStr;
    
    // Generate detailed feedback
    const feedbackHtml = interviewState.answers.map((answer, index) => {
        const hasEvaluation = answer.evaluation !== null;
        const isMCQ = answer.type === 'mcq';
        
        return `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">Question ${index + 1}: ${answer.question}</h5>
                <div class="d-flex justify-content-between mb-2">
                    <span class="badge difficulty-${answer.difficulty}">${answer.difficulty}</span>
                    <span class="badge type-${answer.type}">${answer.type}</span>
                </div>
                <p class="card-text"><strong>Your answer:</strong> ${answer.answer}</p>
                ${isMCQ ? `
                <div class="alert ${answer.isCorrect ? 'alert-success' : 'alert-danger'}">
                    ${answer.isCorrect ? 
                        '<strong>Correct!</strong>' : 
                        `<strong>Incorrect.</strong> The correct answer was: ${answer.correctAnswer}`
                    }
                </div>
                ` : ''}
                ${hasEvaluation ? `
                <div class="alert ${answer.evaluation.score >= 80 ? 'alert-success' : answer.evaluation.score >= 60 ? 'alert-warning' : 'alert-danger'}">
                    <div class="d-flex justify-content-between">
                        <strong>Score:</strong> 
                        <span>${answer.evaluation.score}/100</span>
                    </div>
                    <div class="mt-2"><strong>Feedback:</strong> ${answer.evaluation.feedback}</div>
                    ${answer.evaluation.strengths ? `
                    <div class="mt-2">
                        <strong>Strengths:</strong>
                        <ul class="mt-1 mb-0">
                            ${answer.evaluation.strengths.map(strength => `<li>${strength}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    ${answer.evaluation.areasForImprovement ? `
                    <div class="mt-2">
                        <strong>Suggestions:</strong>
                        <ul class="mt-1 mb-0">
                            ${answer.evaluation.areasForImprovement.map(improvement => `<li>${improvement}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
    
    document.getElementById('detailed-feedback').innerHTML = feedbackHtml;
    
    // Generate overall assessment
    let assessment = `
    <div class="mb-3">
        <h5 class="mb-2">Performance Summary</h5>
        <div class="progress mb-3" style="height: 20px;">
            <div class="progress-bar" role="progressbar" style="width: ${averageScore}%"></div>
        </div>
        <p>You scored <strong>${averageScore}%</strong> overall in this interview.</p>
        ${totalMCQs > 0 ? `<p>Your multiple choice accuracy was <strong>${mcqAccuracy}%</strong> (${correctMCQs} out of ${totalMCQs} correct).</p>` : ''}
    </div>
    
    <div class="mb-3">
        <h5 class="mb-2">Performance by Question Type</h5>
        <div class="row">
            ${Object.entries(typeCounts).map(([type, count]) => {
                if (count === 0) return '';
                const avgScore = type === 'mcq' ? 
                    (typeScores[type] / count) : 
                    Math.round(typeScores[type] / count);
                return `
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between">
                        <span class="badge type-${type}">${type}</span>
                        <span>${avgScore}/100</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-${getAlertClass(avgScore)}" role="progressbar" style="width: ${avgScore}%"></div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    
    <div class="mb-3">
        <h5 class="mb-2">Performance by Difficulty</h5>
        <div class="row">
            ${Object.entries(difficultyCounts).map(([difficulty, count]) => {
                if (count === 0) return '';
                const avgScore = Math.round(difficultyScores[difficulty] / count);
                return `
                <div class="col-md-6 mb-2">
                    <div class="d-flex justify-content-between">
                        <span class="badge difficulty-${difficulty}">${difficulty}</span>
                        <span>${avgScore}/100</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-${getAlertClass(avgScore)}" role="progressbar" style="width: ${avgScore}%"></div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    `;
    
    if (averageScore >= 80) {
        assessment += `
        <div class="alert alert-success">
            <h5><i class="bi bi-check-circle-fill me-2"></i>Excellent Performance!</h5>
            <p class="mb-0">You demonstrated strong knowledge and skills across all areas. Your responses were comprehensive and showed deep understanding of the topics.</p>
        </div>
        `;
    } else if (averageScore >= 60) {
        assessment += `
        <div class="alert alert-warning">
            <h5><i class="bi bi-check-circle-fill me-2"></i>Good Performance</h5>
            <p class="mb-0">You showed solid understanding with some areas that could be strengthened. Review the detailed feedback for specific suggestions.</p>
        </div>
        `;
    } else {
        assessment += `
        <div class="alert alert-danger">
            <h5><i class="bi bi-exclamation-triangle-fill me-2"></i>Needs Improvement</h5>
            <p class="mb-0">There is room for improvement in your responses. We recommend reviewing the technical concepts and practicing your interview skills.</p>
        </div>
        `;
    }
    
    document.getElementById('overall-assessment').innerHTML = assessment;
    
    // Speak completion message
    const completionMessage = `Interview completed. You scored ${averageScore} percent overall. `;
    speak(completionMessage);
}

// Generate and download report as PDF
function generateAndDownloadReport() {
    // Create report HTML
    const reportHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Interview Report - ${interviewState.candidate.name}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 0 auto; padding: 20px; }
            h1, h2, h3 { color: #2c3e50; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .candidate-info { margin-bottom: 30px; }
            .summary { background: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
            .question { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .question:last-child { border-bottom: none; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 12px; font-weight: bold; }
            .badge.easy { background: #d4edda; color: #155724; }
            .badge.medium { background: #fff3cd; color: #856404; }
            .badge.hard { background: #f8d7da; color: #721c24; }
            .badge.mcq { background: #d1ecf1; color: #0c5460; }
            .badge.technical { background: #e2e3e5; color: #383d41; }
            .badge.behavioral { background: #d1e7dd; color: #0f5132; }
            .badge.situational { background: #cfe2ff; color: #084298; }
            .alert { padding: 15px; border-radius: 4px; margin-bottom: 15px; }
            .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .alert-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .alert-warning { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
            .progress { height: 20px; background: #e9ecef; border-radius: 4px; margin-bottom: 10px; }
            .progress-bar { background: #007bff; }
            .row { display: flex; flex-wrap: wrap; margin: 0 -15px; }
            .col-md-6 { flex: 0 0 50%; max-width: 50%; padding: 0 15px; }
            @page { size: A4; margin: 1cm; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Interview Report</h1>
            <h2>${interviewState.candidate.role} Position</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="candidate-info">
            <h3>Candidate Information</h3>
            <p><strong>Name:</strong> ${interviewState.candidate.name}</p>
            <p><strong>Email:</strong> ${interviewState.candidate.email}</p>
            <p><strong>Experience:</strong> ${interviewState.candidate.experience}</p>
        </div>
        
        <div class="summary">
            <h3>Interview Summary</h3>
            <p><strong>Total Questions:</strong> ${interviewState.answers.length}</p>
            <p><strong>Overall Score:</strong> ${calculateOverallScore()}%</p>
            ${calculateMCQAccuracy()}
            <p><strong>Interview Duration:</strong> ${document.getElementById('interview-duration').textContent}</p>
        </div>
        
        <h3>Detailed Feedback</h3>
        ${generateDetailedFeedbackForPDF()}
        
        <div class="overall-assessment">
            <h3>Overall Assessment</h3>
            ${generateOverallAssessmentForPDF()}
        </div>
    </body>
    </html>
    `;

    // Create a Blob with the HTML content
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `Interview_Report_${interviewState.candidate.name.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Helper function to calculate overall score for PDF
function calculateOverallScore() {
    let totalScore = 0;
    let scoredAnswers = 0;
    
    interviewState.answers.forEach(answer => {
        if (answer.evaluation?.score) {
            totalScore += answer.evaluation.score;
            scoredAnswers++;
        } else if (answer.isCorrect !== undefined) {
            // For MCQs without evaluation
            totalScore += answer.isCorrect ? 100 : 0;
            scoredAnswers++;
        }
    });
    
    return scoredAnswers > 0 ? Math.round(totalScore / scoredAnswers) : 0;
}

// Helper function to calculate MCQ accuracy for PDF
function calculateMCQAccuracy() {
    let correctMCQs = 0;
    let totalMCQs = 0;
    
    interviewState.answers.forEach(answer => {
        if (answer.type === 'mcq') {
            totalMCQs++;
            if (answer.isCorrect) correctMCQs++;
        }
    });
    
    return totalMCQs > 0 ? 
        `<p><strong>MCQ Accuracy:</strong> ${Math.round((correctMCQs / totalMCQs) * 100)}% (${correctMCQs} out of ${totalMCQs} correct)</p>` : 
        '';
}

// Helper function to generate detailed feedback for PDF
function generateDetailedFeedbackForPDF() {
    return interviewState.answers.map((answer, index) => {
        const hasEvaluation = answer.evaluation !== null;
        const isMCQ = answer.type === 'mcq';
        
        return `
        <div class="question">
            <h4>Question ${index + 1}: ${answer.question}</h4>
            <div>
                <span class="badge difficulty-${answer.difficulty}">${answer.difficulty}</span>
                <span class="badge type-${answer.type}">${answer.type}</span>
            </div>
            <p><strong>Your answer:</strong> ${answer.answer}</p>
            ${isMCQ ? `
            <div class="alert ${answer.isCorrect ? 'alert-success' : 'alert-danger'}">
                ${answer.isCorrect ? 
                    '<strong>Correct!</strong>' : 
                    `<strong>Incorrect.</strong> The correct answer was: ${answer.correctAnswer}`
                }
            </div>
            ` : ''}
            ${hasEvaluation ? `
            <div class="alert ${answer.evaluation.score >= 80 ? 'alert-success' : answer.evaluation.score >= 60 ? 'alert-warning' : 'alert-danger'}">
                <div><strong>Score:</strong> ${answer.evaluation.score}/100</div>
                <div class="mt-2"><strong>Feedback:</strong> ${answer.evaluation.feedback}</div>
                ${answer.evaluation.strengths ? `
                <div class="mt-2">
                    <strong>Strengths:</strong>
                    <ul>
                        ${answer.evaluation.strengths.map(strength => `<li>${strength}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                ${answer.evaluation.areasForImprovement ? `
                <div class="mt-2">
                    <strong>Suggestions:</strong>
                    <ul>
                        ${answer.evaluation.areasForImprovement.map(improvement => `<li>${improvement}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

// Helper function to generate overall assessment for PDF
function generateOverallAssessmentForPDF() {
    const overallScore = calculateOverallScore();
    
    if (overallScore >= 80) {
        return `
        <div class="alert alert-success">
            <h4>Excellent Performance!</h4>
            <p>You demonstrated strong knowledge and skills across all areas. Your responses were comprehensive and showed deep understanding of the topics.</p>
        </div>
        `;
    } else if (overallScore >= 60) {
        return `
        <div class="alert alert-warning">
            <h4>Good Performance</h4>
            <p>You showed solid understanding with some areas that could be strengthened. Review the detailed feedback for specific suggestions.</p>
        </div>
        `;
    } else {
        return `
        <div class="alert alert-danger">
            <h4>Needs Improvement</h4>
            <p>There is room for improvement in your responses. We recommend reviewing the technical concepts and practicing your interview skills.</p>
        </div>
        `;
    }
}

// Helper function to get alert class based on score
function getAlertClass(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
}

// Display AI message
function displayAIMessage(message, isInitial = false) {
    const messageHtml = `
    <div class="d-flex mb-3">
        <div class="flex-shrink-0 me-3">
            <div class="hr-avatar">${AI_AVATAR}</div>
        </div>
        <div class="ai-message p-3">
            <strong>${isInitial ? AI_NAME + ' (' + AI_POSITION + ')' : AI_NAME}:</strong> ${message}
        </div>
    </div>
    `;
    
    chatMessages.innerHTML += messageHtml;
    scrollToBottom();
}

// Display user message
function displayUserMessage(message) {
    const messageHtml = `
    <div class="d-flex mb-3 justify-content-end">
        <div class="user-message p-3">
            <strong>You:</strong> ${message}
        </div>
        <div class="flex-shrink-0 ms-3">
            <div class="user-avatar">${interviewState.candidate.name.charAt(0).toUpperCase()}</div>
        </div>
    </div>
    `;
    
    chatMessages.innerHTML += messageHtml;
    scrollToBottom();
}

// Start timer
function startTimer() {
    let seconds = 0;
    interviewState.timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// Check camera access
function checkCameraAccess() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                cameraFeed.srcObject = stream;
            })
            .catch(err => {
                console.error('Camera access error:', err);
                cameraFeed.innerHTML = '<div class="text-center p-4">Camera access not available</div>';
            });
    } else {
        cameraFeed.innerHTML = '<div class="text-center p-4">Camera not supported</div>';
    }
}

// Setup tab monitoring
function setupTabMonitoring() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            interviewState.isTabActive = false;
            showWarning("Please return to the interview tab.");
        } else {
            interviewState.isTabActive = true;
            warningAlert.style.display = 'none';
        }
    });
}

// Show warning
function showWarning(message) {
    interviewState.cheatingWarnings++;
    warningMessage.textContent = message;
    warningAlert.style.display = 'block';
    
    if (interviewState.cheatingWarnings >= 3) {
        endInterview();
        alert('Interview terminated due to multiple warnings. Please try again with full attention.');
    }
}

// Fallback questions with diverse topics including MCQs
function getFallbackQuestions(role, count) {
    const allQuestions = [
        // MCQ Questions
        {
            question: "What is the main purpose of version control systems like Git?",
            type: "mcq",
            difficulty: "easy",
            options: [
                "To track changes in source code",
                "To improve code performance",
                "To make code more readable",
                "To reduce memory usage"
            ],
            correctAnswer: 0,
            keywords: ["Git", "version control"],
            sampleAnswer: "Version control systems like Git are primarily used to track changes in source code and enable collaboration among developers."
        },
        {
            question: "Which of these is NOT a valid HTTP request method?",
            type: "mcq",
            difficulty: "medium",
            options: [
                "GET",
                "POST",
                "FETCH",
                "DELETE"
            ],
            correctAnswer: 2,
            keywords: ["HTTP", "web development"],
            sampleAnswer: "FETCH is not a standard HTTP request method. The standard methods are GET, POST, PUT, DELETE, etc."
        },
        {
            question: "In JavaScript, what does the 'this' keyword refer to?",
            type: "mcq",
            difficulty: "medium",
            options: [
                "The current function",
                "The global object",
                "The object that owns the executing code",
                "The parent object"
            ],
            correctAnswer: 2,
            keywords: ["JavaScript", "this keyword"],
            sampleAnswer: "In JavaScript, 'this' refers to the object that owns the currently executing code. Its value depends on how a function is called."
        },
        
        // Technical questions
        {
            question: "How would you explain the concept of closures in JavaScript to a junior developer?",
            type: "technical",
            difficulty: "medium",
            keywords: ["JavaScript", "closures", "scope", "lexical environment"],
            sampleAnswer: "I'd explain that a closure is a function that remembers its lexical scope even when executed outside that scope. It has access to its own scope, outer function's variables, and global variables. I'd give an example of a counter function that maintains state between calls."
        },
        {
            question: "Describe your approach to debugging a production issue under time pressure.",
            type: "technical",
            difficulty: "hard",
            keywords: ["debugging", "problem-solving", "production"],
            sampleAnswer: "First I'd reproduce the issue and check logs. Then isolate the component causing it. I'd use a systematic approach - check recent changes, dependencies, and data inputs. I'd communicate clearly with stakeholders about timeline expectations."
        },
        
        // Scenario questions
        {
            question: "You're assigned to a project with unclear requirements. How would you proceed?",
            type: "scenario",
            difficulty: "medium",
            keywords: ["requirements", "communication", "project management"],
            sampleAnswer: "I'd schedule meetings with stakeholders to clarify objectives. Document assumptions and get sign-off. Break down work into small, testable increments. Implement feedback loops to validate direction frequently."
        },
        {
            question: "How would you handle a situation where your technical recommendation conflicts with business priorities?",
            type: "scenario",
            difficulty: "hard",
            keywords: ["communication", "trade-offs", "business alignment"],
            sampleAnswer: "I'd present data on risks and benefits of both approaches. Seek compromise - perhaps a phased implementation. Ultimately respect business decisions while ensuring risks are documented and mitigated."
        },
        
        // Behavioral questions
        {
            question: "Tell me about a time you had to learn a new technology quickly. How did you approach it?",
            type: "behavioral",
            difficulty: "easy",
            keywords: ["learning", "adaptability", "problem-solving"],
            sampleAnswer: "When we needed to implement GraphQL, I took an online course, built a small prototype, and consulted with colleagues who had experience. Within two weeks I was productive and later mentored others."
        },
        {
            question: "Describe a situation where you had to work with a difficult team member. How did you handle it?",
            type: "behavioral",
            difficulty: "medium",
            keywords: ["teamwork", "conflict resolution", "communication"],
            sampleAnswer: "A teammate was consistently missing deadlines. I had a private conversation to understand challenges they were facing. We worked together to adjust timelines and responsibilities, which improved their performance."
        }
    ];
    
    // Filter questions based on role
    const filteredQuestions = allQuestions.filter(q => {
        if (q.type !== "technical") return true;
        return q.keywords.some(k => ["JavaScript", "React", "CSS"].includes(k));
    });
    
    // Shuffle and select requested number
    return shuffleArray(filteredQuestions).slice(0, count);
}

// Helper to shuffle array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Scroll chat to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load voices and initialize
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = init;
    }
    
    // Some browsers don't support onvoiceschanged
    setTimeout(init, 500);
});