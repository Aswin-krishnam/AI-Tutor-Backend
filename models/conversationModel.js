// conversationModel.js - Enhanced version with personal info extraction

const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Store key points instead of entire question/answer
    keyPoints: { type: [String], required: true },
    // Keep a title/summary of the conversation
    summary: { type: String, required: true },
    // Optional: store original content for reference if needed
    originalQuestion: { type: String, required: true },
    // Store only a condensed version of the answer
    condensedAnswer: { type: String, required: true },
    topic: { type: String },
    hasContext: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Add text index for better search capabilities
conversationSchema.index({ keyPoints: 'text', summary: 'text', topic: 'text' });

// Helper method to find related conversations
conversationSchema.statics.findRelevantConversations = async function(userId, question, limit = 3) {
    // Extract meaningful keywords (words with 4+ characters)
    const keywords = question.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3)
        .filter(word => !['what', 'when', 'where', 'which', 'who', 'why', 'how', 'the', 'and', 'that', 'this', 'with', 'your'].includes(word));
    
    // If no meaningful keywords, return the most recent conversation
    if (keywords.length === 0) {
        return this.find({ userId })
                   .sort({ createdAt: -1 })
                   .limit(1);
    }
    
    // Prioritize topic and key points matches for better relevance
    const topicMatch = { topic: { $in: keywords.map(k => new RegExp(k, 'i')) } };
    const keyPointsMatch = { keyPoints: { $in: keywords.map(k => new RegExp(k, 'i')) } };
    
    // Find conversations that match topics or key points for this user
    return this.find({
        userId,
        $or: [topicMatch, keyPointsMatch]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('keyPoints summary condensedAnswer topic'); // Only select needed fields
};

// NEW: Extract personal information from text
conversationSchema.statics.extractPersonalInfo = function(text) {
    const personalInfoPatterns = [
        // Name patterns - improved with more specific patterns and boundaries
        { pattern: /my name is (\w+)[\s.,!?]/i, field: "name" },
        { pattern: /i am (\w+)[\s.,!?]/i, field: "name" },
        { pattern: /i'm (\w+)[\s.,!?]/i, field: "name" },
        { pattern: /call me (\w+)[\s.,!?]/i, field: "preferredName" },
        
        // More specific introduction patterns with name capture
        { pattern: /\bi(?:'m| am) ([A-Z][a-z]+)(?:\s|,|\.)/i, field: "name" }, // Captures names that start with capital letter
        
        // Interest patterns - unchanged
        { pattern: /i (like|love|enjoy) ([\w\s,]+)/i, field: "interests", groupIndex: 2 },
        { pattern: /interested in ([\w\s,]+)/i, field: "interests" },
        
        // Background patterns - unchanged
        { pattern: /i (work|study|specialize) in ([\w\s,]+)/i, field: "background", groupIndex: 2 },
        { pattern: /background in ([\w\s,]+)/i, field: "background" },
        
        // Learning goals - unchanged
        { pattern: /trying to (learn|understand|master) ([\w\s,]+)/i, field: "goals", groupIndex: 2 },
        { pattern: /goal is to ([\w\s,]+)/i, field: "goals" },
        { pattern: /i want to (learn|understand|know) ([\w\s,]+)/i, field: "goals", groupIndex: 2 }
    ];
    
    const extractedInfo = {};
    
    // Filter out common words that might be mistaken for names
    const commonWords = [
        "glad", "excited", "happy", "pleased", "sure", "sorry", "here", "just", "going", 
        "trying", "looking", "ready", "done", "good", "great", "fine", "okay", "able", 
        "interested", "learning", "studying", "working", "actually", "really", "very"
    ];
    
    personalInfoPatterns.forEach(({ pattern, field, groupIndex = 1 }) => {
        const match = text.match(pattern);
        if (match) {
            const value = match[groupIndex].trim();
            
            // For name fields, apply additional filtering
            if (field === "name" || field === "preferredName") {
                // Skip if the "name" is actually a common word or too short
                if (commonWords.includes(value.toLowerCase()) || value.length < 2) {
                    return;
                }
                
                // Skip if it's all lowercase (likely not a name)
                if (value === value.toLowerCase() && value.length > 3) {
                    return;
                }
                
                // Additional check: name should start with uppercase
                if (!/^[A-Z][a-z]+/.test(value) && value.length > 3) {
                    return;
                }
            }
            
            if (field === "interests" || field === "goals") {
                if (!extractedInfo[field]) extractedInfo[field] = [];
                // Split by commas or 'and' for multiple items
                const items = value.split(/,|\sand\s/).map(item => item.trim());
                extractedInfo[field].push(...items);
            } else {
                extractedInfo[field] = value;
            }
        }
    });
    
    return extractedInfo;
};

// NEW: Detect subjects from conversation text
conversationSchema.statics.detectSubjects = function(text) {
    const subjectKeywords = {
        'math': ['equation', 'formula', 'calculation', 'math', 'algebra', 'geometry', 'calculus', 'trigonometry'],
        'programming': ['code', 'program', 'function', 'algorithm', 'programming', 'javascript', 'python', 'coding'],
        'science': ['science', 'physics', 'chemistry', 'biology', 'experiment', 'molecule', 'theory'],
        'history': ['history', 'century', 'ancient', 'civilization', 'war', 'kingdom', 'empire'],
        'literature': ['book', 'novel', 'story', 'author', 'character', 'literature', 'fiction'],
        'language': ['grammar', 'vocabulary', 'language', 'translation', 'speak', 'write', 'English', 'Spanish'],
        'business': ['business', 'economics', 'market', 'finance', 'management', 'entrepreneur'],
        'art': ['art', 'design', 'color', 'painting', 'drawing', 'sculpture'],
        'music': ['music', 'song', 'instrument', 'melody', 'rhythm', 'composition']
    };
    
    const lowercaseText = text.toLowerCase();
    const detectedSubjects = [];
    
    Object.entries(subjectKeywords).forEach(([subject, keywords]) => {
        if (keywords.some(keyword => lowercaseText.includes(keyword))) {
            detectedSubjects.push(subject);
        }
    });
    
    return detectedSubjects;
};

// Helper to extract key points from question and answer
conversationSchema.statics.extractKeyPoints = function(question, answer) {
    // Combine question and answer for analysis
    const fullText = question + " " + answer;
    
    // Extract important nouns and concepts (simplified approach)
    const words = fullText.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3)
        .filter(word => !['what', 'when', 'where', 'which', 'who', 'why', 'how', 'the', 'and', 'that', 'this', 'with', 'your', 'would', 'could', 'should', 'have', 'been', 'were', 'they', 'them', 'their'].includes(word));
    
    // Count word frequency
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Get top keywords by frequency
    const sortedWords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
    
    return sortedWords;
};

// Generate a short summary from the conversation
conversationSchema.statics.generateSummary = function(question, answer) {
    // Simple summary: first 10 words of question + topic detection
    const questionStart = question.split(/\s+/).slice(0, 10).join(' ');
    
    // Detect likely topic
    const topicKeywords = ['math', 'history', 'science', 'language', 'programming', 'physics', 'chemistry', 'biology', 'literature', 'computer'];
    const fullText = (question + " " + answer).toLowerCase();
    
    let detectedTopic = 'general';
    for (const topic of topicKeywords) {
        if (fullText.includes(topic)) {
            detectedTopic = topic;
            break;
        }
    }
    
    return `${questionStart}... (${detectedTopic})`;
};

// Method to condense an answer to its essential points
conversationSchema.statics.condenseAnswer = function(answer) {
    // Extract first sentence if it's a short answer
    if (answer.length < 100) {
        return answer;
    }
    
    // For longer answers, extract what looks like key sentences
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Look for important indicators in sentences
    const importantPhrases = ['important', 'key', 'essential', 'remember', 'note', 'critical', 'crucial'];
    const importantSentences = sentences.filter(sentence => 
        importantPhrases.some(phrase => sentence.toLowerCase().includes(phrase))
    );
    
    // If we found important sentences, use those, otherwise use first and last
    if (importantSentences.length > 0) {
        return importantSentences.join('. ') + '.';
    } else {
        // Get first and last sentence for context
        return (sentences[0] + '. ' + sentences[sentences.length - 1] + '.').trim();
    }
};

module.exports = mongoose.model("Conversation", conversationSchema);