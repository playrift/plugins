
val engineVersion: String by rootProject.extra

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    implementation("co.playrift:net-common:$engineVersion")
    "verifyImplementation"("co.playrift:cache:$engineVersion")
    implementation("co.playrift:cfg:$engineVersion")
    implementation("co.playrift:rift-project:$engineVersion")
    "verifyImplementation"("io.netty:netty-all:4.1.79.Final")
}

tasks.register<JavaExec>("verifyDefaultBodyParts") {
    group = "verification"
    mainClass.set("co.playrift.default.bodyparts.scripts.VerifyDefaultBodyPartsKt")
    classpath = sourceSets["verify"].runtimeClasspath
}

tasks.register<JavaExec>("verifyDefaultBodyPartsParity") {
    group = "parity"
    mainClass.set("co.playrift.default.bodyparts.scripts.VerifyDefaultBodyPartsParityKt")
    classpath = sourceSets["verify"].runtimeClasspath
}
