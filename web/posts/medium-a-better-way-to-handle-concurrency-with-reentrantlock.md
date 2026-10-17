---
title: "A Better Way to Handle Concurrency with ReentrantLock in Java"
date: 2025-06-08
summary: "Concurrency issues can sneak into your application even in the most routine flows. Recently, I tackled a bug where multiple requests to update user"
source: https://medium.com/@akshayanand771/a-better-way-to-handle-concurrency-with-reentrantlock-dcfeb14f737f
format: html
---
<p>Concurrency issues can sneak into your application even in the most routine flows. Recently, I tackled a bug where multiple requests to <strong>update user profile settings</strong> (like contact details or preferences) were being processed simultaneously — leading to <strong>duplicate records</strong> in the database.</p><p>The surprising root cause?<br> A <strong>missing unique constraint</strong> on the user_id field and lack of proper thread-safety.</p><p>This post covers how I fixed it using <strong>fine-grained locking with </strong><strong>ReentrantLock</strong>, why synchronized wasn’t good enough, and what I learned from the experience.</p><h3>The Problem</h3><p>Let’s say we have an API like:</p><pre><code>POST /api/profile/update</code></pre><p>This allows users to update their settings.</p><p>Now imagine this:</p><ul><li>The same user triggers <strong>two simultaneous updates</strong>, maybe due to retries or fast UI interactions.</li><li>Both threads check if a profile settings row for user_id exists.</li><li>Both don’t find it.</li><li>Both create and insert a new record for that same user_id.</li></ul><p>End result: <strong>Two rows with the same user ID</strong> in the profile_settings table, causing conflicts later when fetching or updating settings.</p><h3>My Mistake : Missing a Unique Constraint</h3><p>A fundamental oversight was that the user_id column <strong>didn’t have a unique constraint</strong>. The DB allowed multiple rows for the same user, which made this race condition even more dangerous.</p><p>📌 <strong>Fix #1</strong>: I added a <strong>UNIQUE constraint</strong> on user_id in the profile_settings table. This ensures that the database itself prevents duplicates.</p><p>But that wasn’t enough — under high concurrency, the application still <strong>raced</strong> to insert records and hit constraint violations.</p><h3>Initial Thought : Use synchronized</h3><p>My first attempt to prevent this was using synchronized blocks</p><pre><code>synchronized (this) {
    // check and insert/update profile settings
}</code></pre><p>But this approach is too <strong>coarse-grained</strong>:</p><ul><li>Only one thread per JVM could update <em>any</em> profile.</li><li>It would unnecessarily block updates for other users too.</li></ul><h3>Final Solution: Fine-Grained ReentrantLock per User</h3><p>To isolate locking per userId, I used a ConcurrentHashMap&lt;UUID, ReentrantLock&gt; to store locks dynamically for each user:</p><pre><code>ReentrantLock lock = lockMap.computeIfAbsent(userId, id -&gt; new ReentrantLock());
lock.lock();
try {
    // check if settings exist, insert or update
} finally {
    lock.unlock();
    if (!lock.isLocked()) {
        lockMap.remove(userId);
    }
}</code></pre><p>This solution worked beautifully. Each user’s updates are serialized independently. No more conflicts or race conditions.</p><h3>Final Code Example (Generic)</h3><pre><code>public void updateProfileSettings(UUID userId, ProfileSettingsRequest request) {
    ReentrantLock lock = lockMap.computeIfAbsent(userId, id -&gt; new ReentrantLock());
    lock.lock();

try {
        ProfileSettingsEntity settings = repository.findByUserId(userId);
        if (settings == null) {
            settings = new ProfileSettingsEntity(userId, request);
        } else {
            settings.updateFromRequest(request);
        }
        repository.save(settings);
    } finally {
        lock.unlock();
        if (!lock.isLocked()) {
            lockMap.remove(userId);
        }
    }
}</code></pre><h3>Why Not synchronized?</h3><figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*WNiz9l8KheF1XplHfjh37g.png" /></figure><figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*IQZZw8De5rjCjgY4XSdi-Q.png" /><figcaption>Thread-safe user profile update flow with per-user locking and concurrency safeguards.</figcaption></figure><h3>Lessons Learned</h3><ol><li>Always <strong>enforce unique constraints</strong> at the DB level for critical identity fields.</li><li>Use <strong>fine-grained locks</strong> like ReentrantLock when concurrency is isolated by a key (e.g., userId, orderId, etc).</li><li>Avoid synchronized when it can become a <strong>bottleneck</strong> or block unrelated operations.</li></ol><h3>Final Thought</h3><p>Concurrency bugs can be subtle and painful in real-world systems. If your app deals with simultaneous updates per key — <strong>user profiles, orders, inventory, etc.</strong> — ReentrantLock can give you just the right level of control and isolation.</p>
