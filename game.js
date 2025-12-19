// 뱀파이어 서바이버 - 메인 게임 코드

// ========== 게임 설정 ==========
const CONFIG = {
    GAME_DURATION: 300, // 5분 (초)
    PLAYER_SPEED: 200,
    PLAYER_MAX_HP: 100,
    ENEMY_SPAWN_RATE: 1.5, // 초당 스폰
    EXP_TO_LEVEL: level => Math.floor(10 * Math.pow(1.3, level - 1)),
};

// ========== 무기 정의 ==========
const WEAPONS = {
    knife: {
        name: '단검',
        icon: '🔪',
        desc: '가까운 적에게 빠르게 단검을 투척',
        damage: 10,
        cooldown: 0.8,
        projectileSpeed: 400,
        projectileSize: 15,
        pierce: 1,
        count: 1,
        color: '#ffffff',
    },
    fireball: {
        name: '파이어볼',
        icon: '🔥',
        desc: '강력한 화염구를 발사',
        damage: 25,
        cooldown: 1.5,
        projectileSpeed: 300,
        projectileSize: 20,
        pierce: 1,
        count: 1,
        color: '#ff6622',
        aoe: 50,
    },
    lightning: {
        name: '번개',
        icon: '⚡',
        desc: '랜덤 적에게 번개를 내리침',
        damage: 30,
        cooldown: 2,
        range: 200,
        count: 1,
        color: '#ffff00',
    },
    orbit: {
        name: '성경',
        icon: '📖',
        desc: '플레이어 주변을 도는 책',
        damage: 15,
        cooldown: 0.1,
        orbitRadius: 80,
        orbitSpeed: 3,
        count: 1,
        color: '#88aaff',
    },
    garlic: {
        name: '마늘',
        icon: '🧄',
        desc: '주변 적에게 지속 피해',
        damage: 5,
        cooldown: 0.5,
        range: 80,
        count: 1,
        color: '#aaffaa',
    },
    axe: {
        name: '도끼',
        icon: '🪓',
        desc: '높이 날아가는 도끼',
        damage: 35,
        cooldown: 1.2,
        projectileSpeed: 350,
        projectileSize: 25,
        pierce: 3,
        count: 1,
        color: '#aa6633',
    },
};

// ========== 패시브 아이템 ==========
const PASSIVES = {
    might: {
        name: '힘',
        icon: '💪',
        desc: '공격력 10% 증가',
        effect: { damageMultiplier: 0.1 },
        maxLevel: 5,
    },
    armor: {
        name: '방어구',
        icon: '🛡️',
        desc: '받는 피해 10% 감소',
        effect: { damageReduction: 0.1 },
        maxLevel: 5,
    },
    speed: {
        name: '신발',
        icon: '👟',
        desc: '이동속도 10% 증가',
        effect: { speedMultiplier: 0.1 },
        maxLevel: 5,
    },
    magnet: {
        name: '자석',
        icon: '🧲',
        desc: '아이템 획득 범위 25% 증가',
        effect: { pickupRange: 0.25 },
        maxLevel: 5,
    },
    cooldown: {
        name: '시계',
        icon: '⏰',
        desc: '쿨다운 8% 감소',
        effect: { cooldownReduction: 0.08 },
        maxLevel: 5,
    },
    maxHp: {
        name: '생명력',
        icon: '❤️',
        desc: '최대 HP 10% 증가',
        effect: { maxHpMultiplier: 0.1 },
        maxLevel: 5,
    },
    regen: {
        name: '재생',
        icon: '💚',
        desc: '초당 HP 0.5 회복',
        effect: { hpRegen: 0.5 },
        maxLevel: 5,
    },
};

// ========== 게임 상태 ==========
let canvas, ctx;
let gameState = 'menu'; // menu, playing, levelup, gameover, victory
let gameTime = 0;
let lastTime = 0;
let animationId = null;

// 입력 상태
const keys = {};

// 게임 객체들
let player = null;
let enemies = [];
let projectiles = [];
let particles = [];
let expOrbs = [];
let damageTexts = [];

// 스폰 관련
let spawnTimer = 0;
let difficultyMultiplier = 1;

// ========== DOM 요소 ==========
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    levelup: document.getElementById('levelup-screen'),
    gameover: document.getElementById('gameover-screen'),
    victory: document.getElementById('victory-screen'),
};

const hud = {
    hpFill: document.getElementById('hp-fill'),
    hpText: document.getElementById('hp-text'),
    expFill: document.getElementById('exp-fill'),
    expText: document.getElementById('exp-text'),
    timer: document.getElementById('timer'),
    killCount: document.getElementById('kill-count'),
    weaponsDisplay: document.getElementById('weapons-display'),
};

// ========== 초기화 ==========
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 입력 이벤트
    window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
    
    // 버튼 이벤트
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('victory-restart-btn').addEventListener('click', startGame);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// ========== 화면 전환 ==========
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// ========== 게임 시작 ==========
function startGame() {
    gameState = 'playing';
    gameTime = 0;
    lastTime = performance.now();
    
    // 플레이어 초기화
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 20,
        hp: CONFIG.PLAYER_MAX_HP,
        maxHp: CONFIG.PLAYER_MAX_HP,
        level: 1,
        exp: 0,
        expToLevel: CONFIG.EXP_TO_LEVEL(1),
        kills: 0,
        weapons: { knife: { ...WEAPONS.knife, level: 1, timer: 0 } },
        passives: {},
        invincibleTime: 0,
        pickupRange: 50,
        damageMultiplier: 1,
        damageReduction: 0,
        speedMultiplier: 1,
        cooldownMultiplier: 1,
        hpRegen: 0,
    };
    
    // 배열 초기화
    enemies = [];
    projectiles = [];
    particles = [];
    expOrbs = [];
    damageTexts = [];
    
    spawnTimer = 0;
    difficultyMultiplier = 1;
    
    showScreen('game');
    updateHUD();
    updateWeaponsDisplay();
    
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

// ========== 메인 게임 루프 ==========
function gameLoop(currentTime = performance.now()) {
    if (gameState !== 'playing' && gameState !== 'levelup') {
        return;
    }
    
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    if (gameState === 'playing') {
        gameTime += deltaTime;
        
        // 승리 체크
        if (gameTime >= CONFIG.GAME_DURATION) {
            victory();
            return;
        }
        
        // 난이도 증가
        difficultyMultiplier = 1 + (gameTime / 60) * 0.5;
        
        update(deltaTime);
    }
    
    render();
    animationId = requestAnimationFrame(gameLoop);
}

// ========== 업데이트 ==========
function update(dt) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateExpOrbs(dt);
    updateDamageTexts(dt);
    updateWeapons(dt);
    spawnEnemies(dt);
    checkCollisions();
    updateHUD();
    
    // HP 재생
    if (player.hpRegen > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + player.hpRegen * dt);
    }
}

// ========== 플레이어 ==========
function updatePlayer(dt) {
    const speed = CONFIG.PLAYER_SPEED * player.speedMultiplier;
    let dx = 0, dy = 0;
    
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    
    // 대각선 이동 정규화
    if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
    }
    
    player.x += dx * speed * dt;
    player.y += dy * speed * dt;
    
    // 화면 경계 (여유 공간 포함)
    const margin = 1500;
    player.x = Math.max(-margin, Math.min(margin + canvas.width, player.x));
    player.y = Math.max(-margin, Math.min(margin + canvas.height, player.y));
    
    // 무적 시간 감소
    if (player.invincibleTime > 0) {
        player.invincibleTime -= dt;
    }
}

// ========== 적 ==========
function spawnEnemies(dt) {
    spawnTimer += dt;
    
    const spawnInterval = 1 / (CONFIG.ENEMY_SPAWN_RATE * difficultyMultiplier);
    
    while (spawnTimer >= spawnInterval) {
        spawnTimer -= spawnInterval;
        spawnEnemy();
    }
}

function spawnEnemy() {
    // 화면 밖에서 스폰
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(canvas.width, canvas.height) * 0.6;
    
    const types = getEnemyTypes();
    const type = types[Math.floor(Math.random() * types.length)];
    
    enemies.push({
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance,
        radius: type.radius,
        hp: type.hp * difficultyMultiplier,
        maxHp: type.hp * difficultyMultiplier,
        speed: type.speed,
        damage: type.damage,
        exp: type.exp,
        color: type.color,
        emoji: type.emoji,
    });
}

function getEnemyTypes() {
    const types = [
        { radius: 18, hp: 15, speed: 60, damage: 10, exp: 1, color: '#44aa44', emoji: '🧟' },
    ];
    
    if (gameTime > 30) {
        types.push({ radius: 22, hp: 30, speed: 80, damage: 15, exp: 3, color: '#aa4444', emoji: '👹' });
    }
    if (gameTime > 60) {
        types.push({ radius: 25, hp: 50, speed: 50, damage: 20, exp: 5, color: '#4444aa', emoji: '👻' });
    }
    if (gameTime > 120) {
        types.push({ radius: 35, hp: 100, speed: 40, damage: 30, exp: 10, color: '#aa44aa', emoji: '😈' });
    }
    if (gameTime > 180) {
        types.push({ radius: 45, hp: 200, speed: 35, damage: 40, exp: 20, color: '#ffaa00', emoji: '💀' });
    }
    
    return types;
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // 플레이어 추적
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            enemy.x += (dx / dist) * enemy.speed * dt;
            enemy.y += (dy / dist) * enemy.speed * dt;
        }
        
        // 화면에서 너무 멀면 제거
        const distFromPlayer = Math.sqrt(
            Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)
        );
        if (distFromPlayer > 2000) {
            enemies.splice(i, 1);
        }
    }
}

// ========== 무기 시스템 ==========
function updateWeapons(dt) {
    for (const [weaponId, weapon] of Object.entries(player.weapons)) {
        weapon.timer += dt;
        
        const cooldown = weapon.cooldown * player.cooldownMultiplier;
        
        if (weapon.timer >= cooldown) {
            weapon.timer = 0;
            fireWeapon(weaponId, weapon);
        }
    }
}

function fireWeapon(weaponId, weapon) {
    switch (weaponId) {
        case 'knife':
            fireKnife(weapon);
            break;
        case 'fireball':
            fireFireball(weapon);
            break;
        case 'lightning':
            fireLightning(weapon);
            break;
        case 'orbit':
            updateOrbit(weapon);
            break;
        case 'garlic':
            fireGarlic(weapon);
            break;
        case 'axe':
            fireAxe(weapon);
            break;
    }
}

function fireKnife(weapon) {
    const nearestEnemies = getNearestEnemies(weapon.count + weapon.level - 1);
    
    nearestEnemies.forEach(enemy => {
        const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        createProjectile(weapon, angle, '🔪');
    });
}

function fireFireball(weapon) {
    const count = weapon.count + Math.floor(weapon.level / 2);
    const nearestEnemies = getNearestEnemies(count);
    
    nearestEnemies.forEach(enemy => {
        const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
        createProjectile(weapon, angle, '🔥', true);
    });
}

function fireLightning(weapon) {
    const count = weapon.count + Math.floor(weapon.level / 2);
    const range = weapon.range + weapon.level * 30;
    
    const targets = enemies
        .filter(e => Math.sqrt(Math.pow(e.x - player.x, 2) + Math.pow(e.y - player.y, 2)) < range)
        .slice(0, count);
    
    targets.forEach(enemy => {
        const damage = weapon.damage * player.damageMultiplier * (1 + weapon.level * 0.2);
        dealDamage(enemy, damage);
        
        // 번개 이펙트
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.3,
                maxLife: 0.3,
                color: weapon.color,
                size: 8,
            });
        }
    });
}

function updateOrbit(weapon) {
    // 오비트는 특별 처리 - 계속 데미지
    const count = weapon.count + weapon.level - 1;
    const radius = weapon.orbitRadius + weapon.level * 10;
    const time = performance.now() / 1000;
    
    for (let i = 0; i < count; i++) {
        const angle = time * weapon.orbitSpeed + (i * Math.PI * 2 / count);
        const orbX = player.x + Math.cos(angle) * radius;
        const orbY = player.y + Math.sin(angle) * radius;
        
        // 적과 충돌 체크
        enemies.forEach(enemy => {
            const dist = Math.sqrt(Math.pow(enemy.x - orbX, 2) + Math.pow(enemy.y - orbY, 2));
            if (dist < enemy.radius + 20) {
                const damage = weapon.damage * player.damageMultiplier * (1 + weapon.level * 0.15);
                dealDamage(enemy, damage);
            }
        });
    }
}

function fireGarlic(weapon) {
    const range = weapon.range + weapon.level * 15;
    const damage = weapon.damage * player.damageMultiplier * (1 + weapon.level * 0.2);
    
    enemies.forEach(enemy => {
        const dist = Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2));
        if (dist < range) {
            dealDamage(enemy, damage);
            
            // 넉백
            const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
            enemy.x += Math.cos(angle) * 10;
            enemy.y += Math.sin(angle) * 10;
        }
    });
}

function fireAxe(weapon) {
    const count = weapon.count + Math.floor(weapon.level / 3);
    
    for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        const proj = createProjectile(weapon, angle, '🪓');
        proj.gravity = 300;
        proj.vy = -350;
    }
}

function createProjectile(weapon, angle, emoji, aoe = false) {
    const proj = {
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * weapon.projectileSpeed,
        vy: Math.sin(angle) * weapon.projectileSpeed,
        damage: weapon.damage * player.damageMultiplier * (1 + weapon.level * 0.2),
        size: weapon.projectileSize + weapon.level * 2,
        pierce: weapon.pierce + Math.floor(weapon.level / 2),
        color: weapon.color,
        emoji: emoji,
        aoe: aoe ? (weapon.aoe || 0) + weapon.level * 10 : 0,
        life: 3,
        rotation: 0,
    };
    projectiles.push(proj);
    return proj;
}

function getNearestEnemies(count) {
    return enemies
        .map(e => ({
            enemy: e,
            dist: Math.sqrt(Math.pow(e.x - player.x, 2) + Math.pow(e.y - player.y, 2))
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, count)
        .map(e => e.enemy);
}

// ========== 투사체 ==========
function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        // 중력 (도끼용)
        if (proj.gravity) {
            proj.vy += proj.gravity * dt;
        }
        
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.rotation += dt * 10;
        proj.life -= dt;
        
        if (proj.life <= 0) {
            projectiles.splice(i, 1);
        }
    }
}

// ========== 경험치 오브 ==========
function updateExpOrbs(dt) {
    for (let i = expOrbs.length - 1; i >= 0; i--) {
        const orb = expOrbs[i];
        
        const dist = Math.sqrt(Math.pow(orb.x - player.x, 2) + Math.pow(orb.y - player.y, 2));
        const pickupRange = player.pickupRange;
        
        // 자석 효과
        if (dist < pickupRange * 3) {
            const speed = 400 * (1 - dist / (pickupRange * 3));
            const angle = Math.atan2(player.y - orb.y, player.x - orb.x);
            orb.x += Math.cos(angle) * speed * dt;
            orb.y += Math.sin(angle) * speed * dt;
        }
        
        // 수집
        if (dist < pickupRange) {
            player.exp += orb.value;
            expOrbs.splice(i, 1);
            
            // 레벨업 체크
            while (player.exp >= player.expToLevel) {
                player.exp -= player.expToLevel;
                player.level++;
                player.expToLevel = CONFIG.EXP_TO_LEVEL(player.level);
                showLevelUp();
            }
        }
    }
}

// ========== 충돌 체크 ==========
function checkCollisions() {
    // 투사체 vs 적
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dist = Math.sqrt(Math.pow(proj.x - enemy.x, 2) + Math.pow(proj.y - enemy.y, 2));
            
            if (dist < proj.size / 2 + enemy.radius) {
                dealDamage(enemy, proj.damage);
                
                // AOE
                if (proj.aoe > 0) {
                    enemies.forEach(e => {
                        if (e !== enemy) {
                            const aoeDist = Math.sqrt(Math.pow(proj.x - e.x, 2) + Math.pow(proj.y - e.y, 2));
                            if (aoeDist < proj.aoe) {
                                dealDamage(e, proj.damage * 0.5);
                            }
                        }
                    });
                    
                    // 폭발 이펙트
                    for (let k = 0; k < 10; k++) {
                        particles.push({
                            x: proj.x,
                            y: proj.y,
                            vx: (Math.random() - 0.5) * 300,
                            vy: (Math.random() - 0.5) * 300,
                            life: 0.5,
                            maxLife: 0.5,
                            color: proj.color,
                            size: 10,
                        });
                    }
                }
                
                proj.pierce--;
                if (proj.pierce <= 0) {
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    // 적 vs 플레이어
    if (player.invincibleTime <= 0) {
        for (const enemy of enemies) {
            const dist = Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2));
            
            if (dist < enemy.radius + player.radius) {
                const damage = enemy.damage * (1 - player.damageReduction);
                player.hp -= damage;
                player.invincibleTime = 0.5;
                
                // 데미지 텍스트
                damageTexts.push({
                    x: player.x,
                    y: player.y - 30,
                    text: Math.round(damage).toString(),
                    life: 1,
                    color: '#ff4444',
                    size: 20,
                });
                
                // 화면 흔들림 효과
                canvas.style.transform = `translate(${(Math.random()-0.5)*10}px, ${(Math.random()-0.5)*10}px)`;
                setTimeout(() => canvas.style.transform = '', 50);
                
                if (player.hp <= 0) {
                    gameOver();
                    return;
                }
                
                break;
            }
        }
    }
}

function dealDamage(enemy, damage) {
    enemy.hp -= damage;
    
    // 데미지 텍스트
    damageTexts.push({
        x: enemy.x + (Math.random() - 0.5) * 20,
        y: enemy.y - 20,
        text: Math.round(damage).toString(),
        life: 0.8,
        color: '#ffff00',
        size: 14,
    });
    
    if (enemy.hp <= 0) {
        // 경험치 드롭
        expOrbs.push({
            x: enemy.x,
            y: enemy.y,
            value: enemy.exp,
            size: 8 + enemy.exp,
        });
        
        // 사망 이펙트
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: enemy.x,
                y: enemy.y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.4,
                maxLife: 0.4,
                color: enemy.color,
                size: 8,
            });
        }
        
        player.kills++;
        const idx = enemies.indexOf(enemy);
        if (idx > -1) enemies.splice(idx, 1);
    }
}

// ========== 파티클 ==========
function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateDamageTexts(dt) {
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const t = damageTexts[i];
        t.y -= 40 * dt;
        t.life -= dt;
        
        if (t.life <= 0) {
            damageTexts.splice(i, 1);
        }
    }
}

// ========== 렌더링 ==========
function render() {
    // 카메라 오프셋 (플레이어 중심)
    const camX = player.x - canvas.width / 2;
    const camY = player.y - canvas.height / 2;
    
    // 배경
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 배경 그리드
    drawGrid(camX, camY);
    
    ctx.save();
    ctx.translate(-camX, -camY);
    
    // 경험치 오브
    expOrbs.forEach(orb => {
        const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size * 2);
        glow.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
        glow.addColorStop(1, 'rgba(100, 200, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#66ddff';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // 마늘 범위 표시
    if (player.weapons.garlic) {
        const garlic = player.weapons.garlic;
        const range = garlic.range + garlic.level * 15;
        ctx.strokeStyle = 'rgba(170, 255, 170, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, range, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // 오비트 무기
    if (player.weapons.orbit) {
        const orbit = player.weapons.orbit;
        const count = orbit.count + orbit.level - 1;
        const radius = orbit.orbitRadius + orbit.level * 10;
        const time = performance.now() / 1000;
        
        for (let i = 0; i < count; i++) {
            const angle = time * orbit.orbitSpeed + (i * Math.PI * 2 / count);
            const orbX = player.x + Math.cos(angle) * radius;
            const orbY = player.y + Math.sin(angle) * radius;
            
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📖', orbX, orbY);
        }
    }
    
    // 적
    enemies.forEach(enemy => {
        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + enemy.radius * 0.8, enemy.radius * 0.8, enemy.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 이모지
        ctx.font = `${enemy.radius * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.emoji, enemy.x, enemy.y);
        
        // HP 바
        if (enemy.hp < enemy.maxHp) {
            const barWidth = enemy.radius * 2;
            const barHeight = 4;
            const barY = enemy.y - enemy.radius - 10;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * (enemy.hp / enemy.maxHp), barHeight);
        }
    });
    
    // 플레이어
    const playerAlpha = player.invincibleTime > 0 ? 0.5 + Math.sin(performance.now() / 50) * 0.3 : 1;
    ctx.globalAlpha = playerAlpha;
    
    // 플레이어 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + player.radius * 0.8, player.radius * 0.8, player.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 플레이어 이모지
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧛', player.x, player.y);
    
    ctx.globalAlpha = 1;
    
    // 투사체
    projectiles.forEach(proj => {
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.rotation);
        ctx.font = `${proj.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(proj.emoji, 0, 0);
        ctx.restore();
    });
    
    // 파티클
    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    
    // 데미지 텍스트
    damageTexts.forEach(t => {
        const alpha = t.life;
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${t.size}px 'Press Start 2P', monospace`;
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1;
    
    ctx.restore();
}

function drawGrid(camX, camY) {
    const gridSize = 80;
    ctx.strokeStyle = 'rgba(50, 40, 80, 0.5)';
    ctx.lineWidth = 1;
    
    const startX = -camX % gridSize;
    const startY = -camY % gridSize;
    
    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// ========== HUD 업데이트 ==========
function updateHUD() {
    // HP
    const hpPercent = (player.hp / player.maxHp) * 100;
    hud.hpFill.style.width = hpPercent + '%';
    hud.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    
    if (hpPercent < 30) {
        hud.hpFill.classList.add('low');
    } else {
        hud.hpFill.classList.remove('low');
    }
    
    // EXP
    const expPercent = (player.exp / player.expToLevel) * 100;
    hud.expFill.style.width = expPercent + '%';
    hud.expText.textContent = `Lv.${player.level}`;
    
    // 타이머
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    hud.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // 킬 카운트
    hud.killCount.textContent = player.kills;
}

function updateWeaponsDisplay() {
    hud.weaponsDisplay.innerHTML = '';
    
    for (const [id, weapon] of Object.entries(player.weapons)) {
        const div = document.createElement('div');
        div.className = 'weapon-icon';
        div.innerHTML = `
            ${weapon.icon}
            <span class="weapon-level">${weapon.level}</span>
        `;
        hud.weaponsDisplay.appendChild(div);
    }
}

// ========== 레벨업 ==========
function showLevelUp() {
    gameState = 'levelup';
    showScreen('levelup');
    
    const options = getUpgradeOptions(3);
    const container = document.getElementById('upgrade-options');
    container.innerHTML = '';
    
    options.forEach(option => {
        const card = document.createElement('div');
        card.className = 'upgrade-card' + (option.isNew ? ' new' : '');
        
        const levelText = option.isNew ? 'NEW!' : `Lv.${option.currentLevel} → ${option.currentLevel + 1}`;
        
        card.innerHTML = `
            <div class="upgrade-icon">${option.icon}</div>
            <div class="upgrade-name">${option.name}</div>
            <div class="upgrade-desc">${option.desc}</div>
            <div class="upgrade-level">${levelText}</div>
        `;
        
        card.addEventListener('click', () => selectUpgrade(option));
        container.appendChild(card);
    });
}

function getUpgradeOptions(count) {
    const options = [];
    const allOptions = [];
    
    // 무기 업그레이드
    for (const [id, weapon] of Object.entries(WEAPONS)) {
        if (player.weapons[id]) {
            if (player.weapons[id].level < 8) {
                allOptions.push({
                    type: 'weapon',
                    id: id,
                    name: weapon.name,
                    icon: weapon.icon,
                    desc: weapon.desc,
                    isNew: false,
                    currentLevel: player.weapons[id].level,
                });
            }
        } else if (Object.keys(player.weapons).length < 6) {
            allOptions.push({
                type: 'weapon',
                id: id,
                name: weapon.name,
                icon: weapon.icon,
                desc: weapon.desc,
                isNew: true,
                currentLevel: 0,
            });
        }
    }
    
    // 패시브 업그레이드
    for (const [id, passive] of Object.entries(PASSIVES)) {
        const currentLevel = player.passives[id] || 0;
        if (currentLevel < passive.maxLevel) {
            allOptions.push({
                type: 'passive',
                id: id,
                name: passive.name,
                icon: passive.icon,
                desc: passive.desc,
                isNew: currentLevel === 0,
                currentLevel: currentLevel,
            });
        }
    }
    
    // 랜덤하게 선택
    while (options.length < count && allOptions.length > 0) {
        const idx = Math.floor(Math.random() * allOptions.length);
        options.push(allOptions.splice(idx, 1)[0]);
    }
    
    return options;
}

function selectUpgrade(option) {
    if (option.type === 'weapon') {
        if (player.weapons[option.id]) {
            player.weapons[option.id].level++;
        } else {
            player.weapons[option.id] = { 
                ...WEAPONS[option.id], 
                level: 1, 
                timer: 0 
            };
        }
    } else {
        player.passives[option.id] = (player.passives[option.id] || 0) + 1;
        applyPassive(option.id);
    }
    
    updateWeaponsDisplay();
    gameState = 'playing';
    showScreen('game');
}

function applyPassive(passiveId) {
    const passive = PASSIVES[passiveId];
    const effect = passive.effect;
    
    if (effect.damageMultiplier) {
        player.damageMultiplier += effect.damageMultiplier;
    }
    if (effect.damageReduction) {
        player.damageReduction = Math.min(0.9, player.damageReduction + effect.damageReduction);
    }
    if (effect.speedMultiplier) {
        player.speedMultiplier += effect.speedMultiplier;
    }
    if (effect.pickupRange) {
        player.pickupRange *= (1 + effect.pickupRange);
    }
    if (effect.cooldownReduction) {
        player.cooldownMultiplier *= (1 - effect.cooldownReduction);
    }
    if (effect.maxHpMultiplier) {
        const hpRatio = player.hp / player.maxHp;
        player.maxHp = Math.floor(CONFIG.PLAYER_MAX_HP * (1 + effect.maxHpMultiplier * player.passives[passiveId]));
        player.hp = player.maxHp * hpRatio;
    }
    if (effect.hpRegen) {
        player.hpRegen += effect.hpRegen;
    }
}

// ========== 게임 오버 / 승리 ==========
function gameOver() {
    gameState = 'gameover';
    
    document.getElementById('final-time').textContent = hud.timer.textContent;
    document.getElementById('final-kills').textContent = player.kills;
    document.getElementById('final-level').textContent = player.level;
    
    showScreen('gameover');
}

function victory() {
    gameState = 'victory';
    
    document.getElementById('victory-kills').textContent = player.kills;
    document.getElementById('victory-level').textContent = player.level;
    
    showScreen('victory');
}

// ========== 시작 ==========
init();

