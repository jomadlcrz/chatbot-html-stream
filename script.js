const resetButton = document.getElementById('resetChat');

// Reset chat when button is clicked
resetButton.addEventListener('click', () => {
    localStorage.removeItem('conversationHistory'); // Clear local storage
    conversationHistory = []; // Reset chat history array
    chatBox.innerHTML = ""; // Clear UI chat messages
    displayWelcomeMessageIfNeeded(); // Show welcome message again

    // Abort the ongoing fetch request if any
    if (abortController) {
        abortController.abort();
    }
});

const chatBox = document.getElementById('chatBox'),
  userInput = document.getElementById('userInput'),
  sendButton = document.getElementById('sendButton');
const apiUrl = "https://server-gemini-stream.vercel.app/chat"; // Updated API URL

// Initialize markdown-it
const md = new markdownit({ breaks: true, html: false });

// Keep track of the conversation history for continuous conversation
let conversationHistory = [];
let abortController; // Declare AbortController
let isAutoScrolling = true; // Track auto-scroll state

// Function to add message with Markdown parsing (except for user messages)
const addMessage = (content, sender) => {
  let msg = document.createElement('div');
  msg.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
  
  if (sender === 'user') {
    msg.textContent = content;
  } else {
    const normalizedContent = content.replace(/\n{2,}/g, '\n');
    msg.innerHTML = md.render(normalizedContent);
    
    // Store the original Markdown content in a data attribute
    msg.dataset.markdownContent = content;
    
    // Add copy button for bot messages
    let copyTextButton = document.createElement('button');
    copyTextButton.classList.add('copy-text-btn');
    copyTextButton.innerHTML = `<i class="fa-regular fa-clone"></i>`;
    
    // Handle copy event
    copyTextButton.onclick = () => {
      // Retrieve the original Markdown content from the data attribute
      let markdownToCopy = msg.dataset.markdownContent;
      
      // Copy the Markdown content to the clipboard
      navigator.clipboard.writeText(markdownToCopy).then(() => {
        // Change the icon to indicate success
        copyTextButton.innerHTML = `<i class="fa-solid fa-check"></i>`;
        setTimeout(() => copyTextButton.innerHTML = `<i class="fa-regular fa-clone"></i>`, 1500);
      }).catch((error) => {
        console.error('Failed to copy Markdown content:', error);
      });
    };
    
    // Append the copy button to the bot message
    msg.appendChild(copyTextButton);
    
    // Highlight and enhance code blocks
    msg.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightBlock(block);
      
      // Detect the language
      let detectedLang = block.className.match(/language-(\w+)/);
      let langLabel = detectedLang ? detectedLang[1] : "Code";
      
      // Create a wrapper for styling
      let preWrapper = document.createElement('div');
      preWrapper.classList.add('code-wrapper');
      
      // Create label
      let label = document.createElement('span');
      label.classList.add('code-lang');
      label.textContent = langLabel;
      
      // Create copy button for code blocks
      let copyButton = document.createElement('button');
      copyButton.classList.add('copy-code-btn');
      copyButton.innerHTML = `<i class="fa-regular fa-clone"></i> Copy code`;
      
      copyButton.onclick = () => {
        navigator.clipboard.writeText(block.textContent);
        copyButton.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
        setTimeout(() => copyButton.innerHTML = `<i class="fa-regular fa-clone"></i> Copy code`, 1500);
      };
      
      // Wrap pre inside wrapper and append elements
      let preElement = block.parentElement;
      preElement.parentElement.replaceChild(preWrapper, preElement);
      preWrapper.appendChild(label);
      preWrapper.appendChild(copyButton);
      preWrapper.appendChild(preElement);
    });
  }
  
  chatBox.appendChild(msg);
  if (isAutoScrolling) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

// Function to load chat history from local storage
const loadChatHistory = () => {
  const savedHistory = JSON.parse(localStorage.getItem('conversationHistory'));
  if (savedHistory) {
    savedHistory.forEach(message => {
      addMessage(message.content, message.role);
      // Ensure that the conversationHistory array is updated accordingly
      conversationHistory.push(message);
    });

    // Highlight code blocks in the loaded messages
    hljs.highlightAll();
  }
};

// Function to save chat history to local storage
const saveChatHistory = () => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
};

// Function to stream bot response word by word with live Markdown rendering
const streamBotResponse = (response, messageElement) => {
    const words = response.split(' ');
    let wordIndex = 0;
    const typingSpeed = 30; // Faster typing effect
    let streamedText = ""; // Accumulate streamed text

    const typeNextWord = () => {
        if (wordIndex < words.length) {
            streamedText += (wordIndex === 0 ? "" : " ") + words[wordIndex]; // Maintain spaces
            wordIndex++;

            // Normalize line breaks before rendering
            const normalizedText = streamedText.replace(/\n{2,}/g, '\n');

            // Render Markdown on the fly
            messageElement.innerHTML = md.render(normalizedText);

            // Enhance code blocks dynamically
            messageElement.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);

                // Ensure we only add buttons once
                if (!block.parentElement.classList.contains('code-wrapper')) {
                    enhanceCodeBlock(block);
                }
            });

            // Auto-scroll if enabled
            if (isAutoScrolling) {
                chatBox.scrollTop = chatBox.scrollHeight;
            }

            setTimeout(typeNextWord, typingSpeed);
        } else {
            // Store raw content in the dataset for copy functionality
            messageElement.dataset.markdownContent = response;

            // Add the copy button
            let copyTextButton = document.createElement('button');
            copyTextButton.classList.add('copy-text-btn');
            copyTextButton.innerHTML = `<i class="fa-regular fa-clone"></i>`;

            copyTextButton.onclick = () => {
                navigator.clipboard.writeText(response).then(() => {
                    copyTextButton.innerHTML = `<i class="fa-solid fa-check"></i>`;
                    setTimeout(() => copyTextButton.innerHTML = `<i class="fa-regular fa-clone"></i>`, 1500);
                }).catch((error) => {
                    console.error('Failed to copy:', error);
                });
            };

            messageElement.appendChild(copyTextButton);

            // **NEW: Ensure the scrollbar scrolls to the bottom after streaming completes**
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    };

    typeNextWord();
};


// Function to enhance code blocks (highlighting, label, and copy button)
const enhanceCodeBlock = (codeBlock) => {
  // Detect the language from the class name
  let detectedLang = codeBlock.className.match(/language-(\w+)/);
  let langLabel = detectedLang ? detectedLang[1] : "Code";

  // Create a wrapper for styling
  let preWrapper = document.createElement('div');
  preWrapper.classList.add('code-wrapper');

  // Create label
  let label = document.createElement('span');
  label.classList.add('code-lang');
  label.textContent = langLabel;

  // Create copy button for code blocks
  let copyButton = document.createElement('button');
  copyButton.classList.add('copy-code-btn');
  copyButton.innerHTML = `<i class="fa-regular fa-clone"></i> Copy code`;

  copyButton.onclick = () => {
    navigator.clipboard.writeText(codeBlock.textContent);
    copyButton.innerHTML = `<i class="fa-solid fa-check"></i> Copied`;
    setTimeout(() => copyButton.innerHTML = `<i class="fa-regular fa-clone"></i> Copy code`, 1500);
  };

  // Replace pre block with the new wrapper and append elements
  let preElement = codeBlock.parentElement;
  preElement.parentElement.replaceChild(preWrapper, preElement);
  preWrapper.appendChild(label);
  preWrapper.appendChild(copyButton);
  preWrapper.appendChild(preElement);
};

// Function to add message with Markdown parsing (except for user messages)
const addMessageWithMarkdown = (content, sender) => {
  let msg = document.createElement('div');
  msg.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

  if (sender === 'user') {
    msg.textContent = content;
  } else {
    // Render markdown immediately and store the raw content for later streaming
    const normalizedContent = content.replace(/\n{2,}/g, '\n');
    const markdownContent = md.render(normalizedContent); // Parse markdown

    // Insert the markdown content into the message element
    msg.innerHTML = markdownContent;

    // Store the raw Markdown content for streaming
    msg.dataset.markdownContent = content;
  }

  chatBox.appendChild(msg);
  if (isAutoScrolling) {
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

// Function to handle sending a message
const sendMessage = () => {
  let message = userInput.value.trim();
  if (!message) return;
  addMessageWithMarkdown(message, 'user');
  userInput.value = '';
  userInput.style.height = "auto"; // Adjusted height
  sendButton.disabled = true;

  // Add the user message to the conversation history
  conversationHistory.push({ role: "user", content: message });
  saveChatHistory(); // Save chat history to local storage

  // Create a new AbortController for each request
  abortController = new AbortController();
  const { signal } = abortController;

  // Add a loading indicator before the stream starts
  const loadingMessage = document.createElement('div');
  loadingMessage.classList.add('message', 'bot-message', 'loading-message');
  loadingMessage.innerHTML = `<i class="fa-solid fa-circle"></i>`;
  chatBox.appendChild(loadingMessage);
  chatBox.scrollTop = chatBox.scrollHeight; // Ensure auto-scrolling when loading

  // Send the conversation history to the API using fetch()
  fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: conversationHistory }),
      signal: signal, // Attach the signal to fetch request
    })
    .then(response => response.json())
    .then(res => {
      console.log(res); // Log the response to inspect its structure

      // Remove the loading indicator
      loadingMessage.remove();

      // Check if the response has the expected message
      if (res && res.response) {
        const botResponse = res.response || "Unexpected response format.";

        // Create a bot message element
        const botMessage = document.createElement('div');
        botMessage.classList.add('message', 'bot-message');
        chatBox.appendChild(botMessage);

        // Stream the bot response word by word with markdown
        streamBotResponse(botResponse, botMessage);

        // Add the bot message to conversation history
        conversationHistory.push({ role: "assistant", content: botResponse });
        saveChatHistory(); // Save updated chat history to local storage
      } else {
        addMessageWithMarkdown("Error: Unexpected response format.", 'bot');
      }

      // Ensure the chat box scrolls to the bottom after the message is sent
      chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch((error) => {
      // Remove the loading indicator in case of an error
      loadingMessage.remove();

      if (error.name === 'AbortError') {
        console.log('Fetch request was aborted');
      } else {
        const errorMsg = document.createElement('div');
        errorMsg.classList.add('message', 'bot-message', 'error-message');
        errorMsg.textContent = "Error: Could not reach AI service.";
        chatBox.appendChild(errorMsg);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    });
};

// Function to remove the welcome message once the user sends a message
const removeWelcomeMessage = () => {
  const welcomeMessage = document.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }
};

// Function to check if the chat history is empty before displaying welcome message
const displayWelcomeMessageIfNeeded = () => {
  if (conversationHistory.length === 0) {
    let welcomeMsg = document.createElement('div');
    welcomeMsg.classList.add('message', 'bot-message', 'welcome-message');
    welcomeMsg.innerHTML = "How can I help you today?";
    chatBox.appendChild(welcomeMsg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
};

// Load chat history from local storage
loadChatHistory();
displayWelcomeMessageIfNeeded();

// Handle user input
userInput.addEventListener('input', () => {
  userInput.style.height = "auto"; // Adjusted height for better input area
  userInput.style.height = Math.min(userInput.scrollHeight, 300) + "px";
  sendButton.disabled = !userInput.value.trim();
});

userInput.addEventListener('keydown', e => {
  if (window.innerWidth <= 768) return;

  if (e.key === 'Enter') {
    if (e.shiftKey) return;
    e.preventDefault();
    removeWelcomeMessage();
    sendMessage();
  }
});

sendButton.addEventListener('click', () => {
  removeWelcomeMessage();
  sendMessage();
});

// Handle manual scrolling to disable auto-scroll
chatBox.addEventListener('scroll', () => {
  const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 1;
  isAutoScrolling = isAtBottom;
});
