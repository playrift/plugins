
val engineVersion: String by rootProject.extra

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    implementation("co.playrift:net-common:$engineVersion")
    implementation("co.playrift:cfg:$engineVersion")
    implementation("co.playrift:rift-project:$engineVersion")
    testImplementation(project(":ui-default"))
    testImplementation("org.tomlj:tomlj:1.1.0")
    "verifyImplementation"("com.google.code.gson:gson:2.8.5")
}

tasks.register<JavaExec>("verifySkills") {
    group = "verification"
    mainClass.set("co.playrift.skills.scripts.VerifySkillsKt")
    classpath = sourceSets["verify"].runtimeClasspath
}
