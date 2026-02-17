// Mobile Navigation Toggle
const mobileToggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle && navLinks) {
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileToggle.classList.toggle('active');
  });

  // Close menu when clicking a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      mobileToggle.classList.remove('active');
    });
  });
}

// Reveal on Scroll
const revealElements = document.querySelectorAll('.reveal, .problem-card, .step-card, .stat-card');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, {
  rootMargin: '0px 0px -50px 0px',
  threshold: 0.1
});

revealElements.forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// Header scroll effect
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 100) {
    header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
  } else {
    header.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
  }
  
  lastScroll = currentScroll;
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Form submission handling
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check honeypot
    const honeypot = contactForm.querySelector('[name="fax_number"]');
    if (honeypot && honeypot.value) {
      // Bot detected - fake success
      showFormMessage('Thank you! We\'ll be in touch soon.', 'success');
      contactForm.reset();
      return;
    }
    
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
      const formData = new FormData(contactForm);
      const data = Object.fromEntries(formData);
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        showFormMessage('Thank you! We\'ll be in touch within 24 hours.', 'success');
        contactForm.reset();
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      showFormMessage('Something went wrong. Please try again or call us directly.', 'error');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
}

function showFormMessage(message, type) {
  const existingMsg = document.querySelector('.form-message');
  if (existingMsg) existingMsg.remove();
  
  const msgEl = document.createElement('div');
  msgEl.className = `form-message form-message-${type}`;
  msgEl.textContent = message;
  msgEl.style.cssText = `
    padding: 1rem;
    margin-top: 1rem;
    border-radius: 8px;
    font-weight: 500;
    background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
    color: ${type === 'success' ? '#155724' : '#721c24'};
  `;
  
  const form = document.querySelector('.contact-form form');
  if (form) form.appendChild(msgEl);
  
  setTimeout(() => msgEl.remove(), 5000);
}
