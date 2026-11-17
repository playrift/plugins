
val engineVersion: String by rootProject.extra

tasks.named<ProcessResources>("processResources") {
    from("ui") { into("META-INF/rift/ts2") }
}

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    implementation("co.playrift:net-common:$engineVersion")
    "verifyImplementation"("co.playrift:cache:$engineVersion")
    implementation("co.playrift:cfg:$engineVersion")
    implementation("co.playrift:rift-project:$engineVersion")
    "verifyImplementation"("io.netty:netty-all:4.1.79.Final")
}

tasks.register<JavaExec>("verifyCombatVisuals") {
    group = "verification"
    mainClass.set("co.playrift.default.combatvisuals.scripts.VerifyCombatVisualsKt")
    classpath = sourceSets["verify"].runtimeClasspath
}

tasks.register<JavaExec>("verifyCombatVisualsParity") {
    group = "parity"
    mainClass.set("co.playrift.default.combatvisuals.scripts.VerifyCombatVisualsParityKt")
    classpath = sourceSets["verify"].runtimeClasspath
}
