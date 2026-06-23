(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  const POSTS = {
    "hiding-root-2026": {
      title: "The Android Cat-and-Mouse Game: Systematically Hiding Root in 2026",
      date: "June 23, 2026",
      readTime: "5 min read",
      tags: ["android", "security"],
      filePath: "posts/hiding-root-2026.md",
    }
  };

  function highlightCode(code, lang) {
    let escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    if (lang === "sh" || lang === "bash") {
      // comments starting with #
      escaped = escaped.replace(/(#.*)/g, '<span class="comment">$1</span>');
      // commands and keywords
      const keywords = ["unshare", "mount", "ksu_susfs", "add_sus_path", "add_sus_mount", "add_sus_kstat", "update_sus_kstat"];
      keywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, "g");
        escaped = escaped.replace(regex, '<span class="keyword">$1</span>');
      });
    } else if (lang === "c" || lang === "cpp" || lang === "java" || lang === "c++") {
      // comments starting with //
      escaped = escaped.replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
      // Match raw quotes since the markdown escaping phase preserves literal double quotes.
      escaped = escaped.replace(/(".*?")/g, '<span class="string">$1</span>');
      // keywords
      const keywords = ["int", "char", "if", "return", "strcmp", "strcpy", "strlen", "const"];
      keywords.forEach(kw => {
        const regex = new RegExp(`\\b(${kw})\\b`, "g");
        escaped = escaped.replace(regex, '<span class="keyword">$1</span>');
      });
      // numbers
      escaped = escaped.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
    }
    return escaped;
  }

  function parseMarkdown(md) {
    let raw = md.replace(/\r\n/g, "\n");

    // Protect code blocks from HTML escaping
    const codeBlocks = [];
    raw = raw.replace(/```(\w*)\n([\s\S]*?)\n```/g, (match, lang, code) => {
      const id = `__CODE_BLOCK_${codeBlocks.length}__`;
      codeBlocks.push({ lang, code });
      return id;
    });

    // Escape raw characters for basic security
    let html = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Horizontal rule
    html = html.replace(/^---$/gim, "<hr>");

    // Blockquotes
    html = html.replace(/^\s*>\s*(.*$)/gim, "<blockquote><p>$1</p></blockquote>");

    // Bold (**text**)
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italics (*text*)
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Inline Code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Unordered and ordered lists processing
    const lines = html.split("\n");
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("* ") || line.startsWith("- ")) {
        let content = lines[i].replace(/^\s*[\*\-]\s+/, "");
        if (inOl) {
          lines[i - 1] = lines[i - 1] + "\n</ol>";
          inOl = false;
        }
        if (!inUl) {
          lines[i] = "<ul>\n<li>" + content + "</li>";
          inUl = true;
        } else {
          lines[i] = "<li>" + content + "</li>";
        }
      } else if (/^\d+\.\s+/.test(line)) {
        let content = lines[i].replace(/^\s*\d+\.\s+/, "");
        if (inUl) {
          lines[i - 1] = lines[i - 1] + "\n</ul>";
          inUl = false;
        }
        if (!inOl) {
          lines[i] = "<ol>\n<li>" + content + "</li>";
          inOl = true;
        } else {
          lines[i] = "<li>" + content + "</li>";
        }
      } else {
        if (inUl) {
          lines[i - 1] = lines[i - 1] + "\n</ul>";
          inUl = false;
        }
        if (inOl) {
          lines[i - 1] = lines[i - 1] + "\n</ol>";
          inOl = false;
        }
      }
    }
    // Close any active list elements remaining at the end of the markdown payload.
    if (inUl) {
      lines[lines.length - 1] = lines[lines.length - 1] + "\n</ul>";
    }
    if (inOl) {
      lines[lines.length - 1] = lines[lines.length - 1] + "\n</ol>";
    }
    html = lines.join("\n");

    // Restore protected code blocks with custom highlighting
    codeBlocks.forEach((block, index) => {
      const placeholder = `__CODE_BLOCK_${index}__`;
      const highlighted = highlightCode(block.code, block.lang);
      html = html.replace(placeholder, `<pre><code class="language-${block.lang}">${highlighted}</code></pre>`);
    });

    // Paragraph blocks grouping
    const blocks = html.split(/\n{2,}/);
    for (let i = 0; i < blocks.length; i++) {
      const trimmed = blocks[i].trim();
      if (!trimmed) continue;

      if (!trimmed.startsWith("<h") &&
          !trimmed.startsWith("<pre") &&
          !trimmed.startsWith("<ul") &&
          !trimmed.startsWith("<ol") &&
          !trimmed.startsWith("<li") &&
          !trimmed.startsWith("<blockquote") &&
          !trimmed.startsWith("<hr") &&
          !trimmed.startsWith("<div")) {
        blocks[i] = `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      }
    }
    html = blocks.join("\n\n");

    return html;
  }

  const feedView = document.getElementById("feed-view");
  const readerView = document.getElementById("reader-view");
  const readerContent = document.getElementById("reader-content");
  
  const readerTitle = document.getElementById("reader-title");
  const readerDate = document.getElementById("reader-date");
  const readerReadTime = document.getElementById("reader-readtime");
  const readerTags = document.getElementById("reader-tags");
  
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");

  function showFeed() {
    readerView.style.display = "none";
    feedView.style.display = "block";
    progressContainer.style.display = "none";
    progressBar.style.width = "0%";
    document.title = "dyok";
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function showPost(postId) {
    const post = POSTS[postId];
    if (!post) {
      showFeed();
      return;
    }

    // Set title and loading text
    document.title = `${post.title} — dyok`;
    readerTitle.textContent = post.title;
    readerDate.textContent = post.date;
    readerReadTime.textContent = post.readTime;
    
    // Set tags
    readerTags.innerHTML = "";
    post.tags.forEach(tag => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = tag;
      readerTags.appendChild(span);
    });

    readerContent.innerHTML = '<p class="loading">// fetching post content...</p>';
    feedView.style.display = "none";
    readerView.style.display = "block";
    progressContainer.style.display = "block";
    window.scrollTo({ top: 0, behavior: "instant" });

    try {
      const res = await fetch(post.filePath);
      if (!res.ok) throw new Error("File not found");
      const mdText = await res.text();
      
      // Strip the primary heading from markdown as it is already rendered in the reader header.
      const cleanMd = mdText.trim().startsWith("# ") ? mdText.substring(mdText.indexOf("\n")).trim() : mdText;

      readerContent.innerHTML = parseMarkdown(cleanMd);
    } catch (err) {
      readerContent.innerHTML = `<p class="error">// failed to load post: ${err.message}</p>`;
    }
  }

  function handleRoute() {
    const hash = window.location.hash;
    const postMatch = hash.match(/^#post\/(.+)$/);
    if (postMatch) {
      showPost(postMatch[1]);
    } else {
      showFeed();
    }
  }

  // Bind clicks on real post cards
  document.querySelectorAll(".post-card:not(.placeholder)").forEach(card => {
    card.addEventListener("click", () => {
      const postId = card.getAttribute("data-post-id");
      if (postId) {
        window.location.hash = `post/${postId}`;
      }
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const postId = card.getAttribute("data-post-id");
        if (postId) {
          window.location.hash = `post/${postId}`;
        }
      }
    });
  });

  const readerBack = document.getElementById("reader-back");
  if (readerBack) {
    readerBack.addEventListener("click", () => {
      window.location.hash = "";
    });
  }

  window.addEventListener("hashchange", handleRoute);
  handleRoute();

  window.addEventListener("scroll", () => {
    if (readerView.style.display !== "none") {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (height > 0) {
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = `${scrolled}%`;
      }
    }
  });

  const aboutBtn = document.getElementById("nav-about");
  const aboutModal = document.getElementById("about-modal");
  const modalClose = document.getElementById("modal-close");

  function openAboutModal() {
    if (aboutModal) {
      aboutModal.showModal();
      // Stagger class toggle to let the browser register the dialog layout for scale/fade transition.
      requestAnimationFrame(() => {
        aboutModal.classList.add("is-open");
      });
    }
  }

  function closeAboutModal() {
    if (aboutModal) {
      aboutModal.classList.remove("is-open");
      // Wait for transition before closing dialog to allow the fade-out to finish.
      setTimeout(() => {
        aboutModal.close();
      }, 250);
    }
  }

  if (aboutBtn) {
    aboutBtn.addEventListener("click", openAboutModal);
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeAboutModal);
  }

  if (aboutModal) {
    aboutModal.addEventListener("click", (e) => {
      if (e.target === aboutModal) {
        closeAboutModal();
      }
    });

    aboutModal.addEventListener("close", () => {
      aboutModal.classList.remove("is-open");
    });
  }
})();
