
val engineVersion: String by rootProject.extra

dependencies {
    implementation("co.playrift:engine:$engineVersion")
    implementation("co.playrift:net-common:$engineVersion")
    implementation("co.playrift:cfg:$engineVersion")
    implementation("co.playrift:rift-project:$engineVersion")
}

tasks.named<Test>("test") {
    dependsOn(":uiDefaultAloneFixture")
    systemProperty("rift.testing.withoutSkillsBundle", rootProject.file("fixtures/ui-default-alone/build/forge/server/bundle.json").path)
}

tasks.named<com.github.gradle.node.task.NodeTask>("compileTs2Main") {
    args.addAll("--stand-in-inventory-size", "rift.ui.default:bag=28")
}
