document.addEventListener('DOMContentLoaded', () => {
	// Accordion: simple accessible implementation
	document.querySelectorAll('.accordion').forEach(accordion => {
		accordion.querySelectorAll('.accordion-item').forEach(item => {
			const header = item.querySelector('.accordion-header');
			const body = item.querySelector('.accordion-body');
			if (!header || !body) return;

			header.setAttribute('role', 'button');
			header.setAttribute('tabindex', '0');
			header.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
			body.style.overflow = 'hidden';
			if (item.classList.contains('open')) body.style.maxHeight = body.scrollHeight + 'px';

			function toggle() {
				const opened = item.classList.toggle('open');
				header.setAttribute('aria-expanded', opened ? 'true' : 'false');
				if (opened) body.style.maxHeight = body.scrollHeight + 'px';
				else body.style.maxHeight = null;
			}

			header.addEventListener('click', toggle);
			header.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
			});
		});
	});

	// Tabs: accessible tablist
	document.querySelectorAll('.tabs').forEach(widget => {
		const tabs = Array.from(widget.querySelectorAll('[role="tab"]'));
		const panels = Array.from(widget.querySelectorAll('[role="tabpanel"]'));
		if (!tabs.length) return;

		function activate(index) {
			tabs.forEach((t, i) => {
				const selected = i === index;
				t.setAttribute('aria-selected', selected ? 'true' : 'false');
				t.tabIndex = selected ? 0 : -1;
				if (panels[i]) panels[i].hidden = !selected;
			});
		}

		tabs.forEach((tab, i) => {
			tab.addEventListener('click', () => activate(i));
			tab.addEventListener('keydown', (e) => {
				let next = null;
				if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
				if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
				if (e.key === 'Home') next = 0;
				if (e.key === 'End') next = tabs.length - 1;
				if (next !== null) { e.preventDefault(); tabs[next].focus(); activate(next); }
			});
		});

		const start = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
		activate(start === -1 ? 0 : start);
	});

	// Modals: data-modal-target="#id"
	document.querySelectorAll('[data-modal-target]').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			const sel = btn.getAttribute('data-modal-target');
			const modal = document.querySelector(sel);
			openModal(modal, btn);
		});
	});

	function openModal(modal, opener) {
		if (!modal) return;
		modal.classList.add('open');
		modal.setAttribute('aria-hidden', 'false');
		document.body.style.overflow = 'hidden';
		const focusEl = modal.querySelector('button, [href], input, textarea, [tabindex]') || modal;
		focusEl.focus();
		modal.dataset.opener = opener ? (opener.id || '') : '';
	}

	function closeModal(modal) {
		if (!modal) return;
		modal.classList.remove('open');
		modal.setAttribute('aria-hidden', 'true');
		document.body.style.overflow = '';
		// try to return focus to opener
		const openerId = modal.dataset.opener;
		if (openerId) {
			const opener = document.getElementById(openerId);
			if (opener) opener.focus();
		}
	}

	// close handlers
	document.addEventListener('click', (e) => {
		// close via .modal-close
		if (e.target.closest && e.target.closest('.modal .modal-close')) {
			const m = e.target.closest('.modal');
			closeModal(m);
		}
		// overlay click
		if (e.target.classList && e.target.classList.contains('modal') && e.target.classList.contains('open')) {
			closeModal(e.target);
		}
	}, true);

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => closeModal(m));
	});


	/* ---------- Contact form handling ---------- */
	const contactForm = document.getElementById('contactForm');
	if (contactForm) {
		contactForm.addEventListener('submit', (ev) => {
			ev.preventDefault();
			const name = contactForm.name.value.trim();
			const email = contactForm.email.value.trim();
			const phone = contactForm.phone.value.trim();
			const message = contactForm.message.value.trim();
			const feedback = document.getElementById('formFeedback');
			feedback.textContent = '';
			let errors = [];
			if (!name) errors.push('Please enter your name.');
			if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email.');
			if (!message) errors.push('Please enter a message.');
			if (errors.length) {
				feedback.innerHTML = '<div class="error">' + errors.join('<br>') + '</div>';
				return;
			}

			// Save to localStorage as a simple simulation of submission
			try {
				const key = 'mk_contact_submissions_v1';
				const stored = JSON.parse(localStorage.getItem(key) || '[]');
				stored.push({ name, email, phone, message, ts: Date.now() });
				localStorage.setItem(key, JSON.stringify(stored));
			} catch (err) { console.warn('localStorage save failed', err); }

			// Clear form
			contactForm.reset();

			// Show success modal (uses modal system above)
			const successModal = document.getElementById('contactSuccess');
			if (successModal && typeof openModal === 'function') openModal(successModal);
			else if (feedback) feedback.innerHTML = '<div style="color:green">Message sent — thank you.</div>';
		});
	}

	/* ---------- Chatbot (simple guided assistant) ---------- */
	(function initChatbot(){
		const toggle = document.getElementById('chatbotToggle');
		const win = document.getElementById('chatbotWindow');
		const messages = document.getElementById('chatMessages');
		const input = document.getElementById('chatInput');
		const send = document.getElementById('chatSend');
		if (!toggle || !win || !messages || !input || !send) return;

		function appendMsg(text, who='bot'){
			const el = document.createElement('div');
			el.className = 'msg ' + (who==='user' ? 'user' : 'bot');
			el.textContent = text;
			messages.appendChild(el);
			messages.scrollTop = messages.scrollHeight;
		}

		function botReply(text){
			setTimeout(() => appendMsg(text, 'bot'), 400);
		}

		// Greeting and quick-options
		function greet(){
			appendMsg('Hi, I\'m the MK Plumbing assistant — how can I help? Try: "services", "quote", or "contact"');
			const opts = ['View services','Request a quote','Contact details'];
			opts.forEach(o => {
				const b = document.createElement('button');
				b.style.margin = '6px 6px 0 0';
				b.textContent = o;
				b.addEventListener('click', () => handleUserText(o));
				messages.appendChild(b);
			});
		}

		function handleUserText(text){
			appendMsg(text, 'user');
			const t = text.toLowerCase();
			if (t.includes('service')){
				botReply('We provide: Leak repairs, Geyser work, Blocked drains, Emergency plumbing, Renovations.');
				botReply('Open the Services page? Click here.');
				const link = document.createElement('a');
				link.href = 'services.html';
				link.textContent = 'Go to Services';
				link.style.display = 'inline-block';
				link.style.marginTop = '8px';
				messages.appendChild(link);
			} else if (t.includes('quote')){
				botReply('I can help with a quote. Please provide a brief message and your contact details in the contact form.');
				const btn = document.createElement('button');
				btn.textContent = 'Open contact form';
				btn.addEventListener('click', () => window.location.href = 'contactus.html');
				messages.appendChild(btn);
			} else if (t.includes('contact') || t.includes('phone') || t.includes('email')){
				botReply('Phone: 065 545 4705 — Email: MKplumbing@example.com');
			} else if (t.includes('help')){
				botReply('Try asking: "What services do you offer?" or click one of the quick options.');
			} else {
				botReply('Sorry, I didn\'t get that. Try "services", "quote", or "contact".');
			}
		}

		// Toggle
		toggle.addEventListener('click', () => {
			win.classList.toggle('open');
			if (win.classList.contains('open')) { if (!messages.childElementCount) greet(); input.focus(); }
		});

		// Send handlers
		send.addEventListener('click', () => {
			const val = input.value.trim(); if (!val) return; input.value = '';
			handleUserText(val);
		});
		input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send.click(); });
	})();

	/* ---------- Lightbox for .gallery images ---------- */
	(function initLightbox(){
		const imgs = Array.from(document.querySelectorAll('.gallery img'));
		if (!imgs.length) return;

		// Build overlay
		const overlay = document.createElement('div');
		overlay.className = 'lightbox-overlay';
		overlay.innerHTML = `
		  <div class="lightbox-wrap">
		    <img class="lightbox-img" src="" alt="">
		    <div class="lightbox-caption"></div>
		  </div>
		  <button class="lightbox-btn lightbox-prev" aria-label="Previous">‹</button>
		  <button class="lightbox-btn lightbox-next" aria-label="Next">›</button>
		  <button class="lightbox-close" aria-label="Close">Close</button>
		`;
		document.body.appendChild(overlay);

		const lbImg = overlay.querySelector('.lightbox-img');
		const lbCaption = overlay.querySelector('.lightbox-caption');
		const btnPrev = overlay.querySelector('.lightbox-prev');
		const btnNext = overlay.querySelector('.lightbox-next');
		const btnClose = overlay.querySelector('.lightbox-close');

		let current = -1;

		function openAt(i){
			current = i;
			const target = imgs[current];
			lbImg.src = target.src;
			lbImg.alt = target.alt || '';
			lbCaption.textContent = target.alt || '';
			overlay.classList.add('open');
			overlay.focus();
		}

		function close(){
			overlay.classList.remove('open');
			current = -1;
		}

		function next(){ openAt((current + 1) % imgs.length); }
		function prev(){ openAt((current - 1 + imgs.length) % imgs.length); }

		imgs.forEach((el, i) => {
			el.style.cursor = 'zoom-in';
			el.addEventListener('click', (e) => { e.preventDefault(); openAt(i); });
		});

		btnPrev.addEventListener('click', prev);
		btnNext.addEventListener('click', next);
		btnClose.addEventListener('click', close);

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) close();
		});

		document.addEventListener('keydown', (e) => {
			if (!overlay.classList.contains('open')) return;
			if (e.key === 'Escape') close();
			if (e.key === 'ArrowRight') next();
			if (e.key === 'ArrowLeft') prev();
		});

	})();

});
