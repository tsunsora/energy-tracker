package app.vanguard.energy

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.key.*
import androidx.compose.ui.input.pointer.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.vanguard.energy.resources.Res
import app.vanguard.energy.resources.barlow_semibold
import app.vanguard.energy.resources.dm_sans
import org.jetbrains.compose.resources.Font
import kotlinx.coroutines.Job
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.min

private val Background = Color(0xff101217)
private val Panel = Color(0xff1b2223)
private val Lime = Color(0xffc9f76f)
private val Muted = Color(0xffa3afa5)
private fun playerColor(value: String) = Color(0xff000000 or value.removePrefix("#").toLong(16))

@Composable
fun EnergyApp(session: TrackerSession) {
    val uiFont = FontFamily(Font(Res.font.dm_sans))
    val digitFont = FontFamily(Font(Res.font.barlow_semibold, FontWeight.SemiBold))
    val typography = Typography().let { default ->
        default.copy(
            bodyLarge = default.bodyLarge.copy(fontFamily = uiFont),
            bodyMedium = default.bodyMedium.copy(fontFamily = uiFont),
            labelLarge = default.labelLarge.copy(fontFamily = uiFont),
            titleLarge = default.titleLarge.copy(fontFamily = uiFont),
        )
    }
    MaterialTheme(colorScheme = darkColorScheme(primary = Lime, background = Background, surface = Panel), typography = typography) {
        BoxWithConstraints(Modifier.fillMaxSize().background(Background).windowInsetsPadding(WindowInsets.safeDrawing).padding(4.dp)) {
            val board = session.board
            Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                repeat(2) { row ->
                    Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        repeat(board.preferences.count / 2) { column ->
                            val id = row * (board.preferences.count / 2) + column
                            PlayerZone(board.player(id), board.rotated(id), board.preferences.count == 4 && (id == 0 || id == 3),
                                session, digitFont, Modifier.weight(1f).fillMaxHeight())
                        }
                    }
                }
            }
            Box(Modifier.align(Alignment.Center).size(54.dp).clip(CircleShape).background(Background).padding(5.dp)
                .clip(CircleShape).background(Color(0xff252c2c)).testTag("setup")
                .clickable(role = Role.Button, onClickLabel = "Open setup") { session.showSetup(true) }
                .semantics { contentDescription = "Open setup" }, contentAlignment = Alignment.Center) {
                Canvas(Modifier.size(22.dp)) {
                    val ys = listOf(.23f, .5f, .77f)
                    ys.forEachIndexed { i, y ->
                        drawLine(Muted, Offset(size.width * .08f, size.height * y), Offset(size.width * .92f, size.height * y), 1.6.dp.toPx(), StrokeCap.Round)
                        drawCircle(Muted, 2.5.dp.toPx(), Offset(size.width * if (i == 1) .7f else .3f, size.height * y))
                    }
                }
            }
            session.saveWarning?.let { warning ->
                Text(warning, Modifier.align(Alignment.TopCenter).padding(8.dp).clip(RoundedCornerShape(8.dp))
                    .background(Color(0xffffd69b)).padding(12.dp).semantics { liveRegion = LiveRegionMode.Polite },
                    color = Color(0xff2d210b), fontSize = 12.sp)
            }
            if (session.setupOpen) SetupDialog(session, maxHeight.value)
        }
    }
}

@Composable
private fun PlayerZone(player: Player, rotated: Boolean, nameOnRight: Boolean, session: TrackerSession, digits: FontFamily, modifier: Modifier) {
    val id = player.preference.id
    val color = playerColor(player.preference.color)
    val shape = RoundedCornerShape(14.dp)
    BoxWithConstraints(modifier.clip(shape).background(lerp(Color(0xff151a1b), color, .12f))
        .border(1.dp, lerp(Color(0xff202629), color, .20f), shape).testTag("player-$id")) {
        val zoneWidth = maxWidth.value
        val fontSize = min(zoneWidth * when (player.energy.toString().length) {
            3 -> .30f
            4 -> .23f
            else -> if (zoneWidth <= 260) .57f else .45f
        }, maxHeight.value * if (maxHeight.value <= 340) .24f else .35f).coerceIn(26f, 240f)
        val chargeHeight = min(52f, maxHeight.value * .20f).coerceAtLeast(32f).dp
        Box(Modifier.fillMaxSize().graphicsLayer { rotationZ = if (rotated) 180f else 0f }) {
            Column(Modifier.fillMaxSize()) {
                EnergyHalf("Add 1 energy to ${player.preference.name}", "ADD", true, player.energy < player.limit, false,
                    color, session.gestureEpoch, { session.adjust(id, 1) }, {}, Modifier.weight(1f).fillMaxWidth().testTag("add-$id"))
                EnergyHalf("Remove 1 energy from ${player.preference.name}", "REMOVE", false, player.energy > 0, true,
                    color, session.gestureEpoch, { session.adjust(id, -1) }, { session.reset(id) }, Modifier.weight(1f).fillMaxWidth().testTag("remove-$id"))
            }
            Text(player.energy.toString(), Modifier.align(Alignment.Center).testTag("energy-$id")
                .clearAndSetSemantics { contentDescription = "${player.preference.name}: ${player.energy} energy"; liveRegion = LiveRegionMode.Polite },
                style = TextStyle(fontFamily = digits, fontWeight = FontWeight.SemiBold, fontSize = fontSize.sp,
                    lineHeight = fontSize.sp, color = color, textAlign = TextAlign.Center), maxLines = 1)
            Text(player.preference.name, Modifier.align(if (nameOnRight) Alignment.TopEnd else Alignment.TopStart)
                .padding(12.dp).widthIn(max = min(120f, zoneWidth - 24).dp).height(44.dp)
                .consumeTouches().padding(6.dp),
                color = color.copy(alpha = .8f), fontSize = if (zoneWidth <= 260) 12.sp else 16.sp,
                fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Box(Modifier.align(Alignment.BottomCenter).width(min(180f, zoneWidth - 32).dp).height(chargeHeight)
                .clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)).background(lerp(Color(0xff151a1b), color, .17f))
                .border(1.dp, lerp(Color(0xff151a1b), color, .18f), RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                .testTag("charge-$id").clickable(enabled = player.energy < player.limit, role = Role.Button) { session.adjust(id, 3) }
                .semantics { contentDescription = "Charge +3 for ${player.preference.name}" }, contentAlignment = Alignment.Center) {
                Text("+3", color = color.copy(alpha = if (player.energy < player.limit) .72f else .22f), fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private fun Modifier.consumeTouches() = pointerInput(Unit) {
    awaitPointerEventScope { while (true) awaitPointerEvent().changes.forEach { it.consume() } }
}

@Composable
private fun EnergyHalf(description: String, label: String, up: Boolean, enabled: Boolean, holdable: Boolean,
    color: Color, epoch: Int, onTap: () -> Unit, onHold: () -> Unit, modifier: Modifier) {
    val latestTap by rememberUpdatedState(onTap)
    val latestHold by rememberUpdatedState(onHold)
    val slop = with(LocalDensity.current) { 14.dp.toPx() }
    Box(modifier.semantics {
        role = Role.Button
        contentDescription = description
        if (!enabled) disabled()
        onClick { if (enabled) latestTap(); enabled }
        if (holdable) onLongClick("Reset energy to zero") { if (enabled) latestHold(); enabled }
    }.onKeyEvent { event ->
        if (enabled && (event.key == Key.Enter || event.key == Key.Spacebar) && event.type == KeyEventType.KeyUp) {
            latestTap(); true
        } else false
    }.focusable(enabled).pointerInput(enabled, epoch, slop) {
        if (!enabled) return@pointerInput
        coroutineScope {
            val gesture = EnergyGesture(slop)
            var pointer: PointerId? = null
            var timer: Job? = null
            try {
                awaitPointerEventScope {
                    while (true) {
                        val event = awaitPointerEvent()
                        if (pointer == null) {
                            val down = event.changes.firstOrNull { it.changedToDown() && it.position.x in 0f..size.width.toFloat() && it.position.y in 0f..size.height.toFloat() }
                                ?: continue
                            pointer = down.id
                            gesture.start(down.position.x, down.position.y)
                            down.consume()
                            if (holdable) timer = launch { delay(600); if (gesture.hold()) latestHold() }
                        } else {
                            val change = event.changes.firstOrNull { it.id == pointer } ?: continue
                            gesture.move(change.position.x, change.position.y,
                                !change.isConsumed && change.position.x in 0f..size.width.toFloat() && change.position.y in 0f..size.height.toFloat())
                            if (!gesture.canHold) timer?.cancel()
                            change.consume()
                            if (!change.pressed) {
                                timer?.cancel()
                                if (gesture.release()) latestTap()
                                pointer = null
                            }
                        }
                    }
                }
            } finally { timer?.cancel(); gesture.cancel() }
        }
    }, contentAlignment = Alignment.Center) {
        val tint = lerp(Color(0xff151a1b), color, .48f).copy(alpha = if (enabled) 1f else .5f)
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (up) Chevron(tint, true)
            Text(label, color = tint, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 1.2.sp)
            if (!up) Chevron(tint, false)
        }
    }
}

@Composable
private fun Chevron(color: Color, up: Boolean) {
    Canvas(Modifier.size(40.dp, 26.dp)) {
        val middle = if (up) .3f else .7f
        val edge = 1f - middle
        drawLine(color, Offset(size.width * .28f, size.height * edge), Offset(size.width * .5f, size.height * middle), 2.5.dp.toPx(), StrokeCap.Round)
        drawLine(color, Offset(size.width * .5f, size.height * middle), Offset(size.width * .72f, size.height * edge), 2.5.dp.toPx(), StrokeCap.Round)
    }
}

@Composable
private fun SetupDialog(session: TrackerSession, availableHeight: Float) {
    Dialog(onDismissRequest = { session.showSetup(false) }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(Modifier.widthIn(max = 440.dp).fillMaxWidth(.94f).heightIn(max = (availableHeight - 24).coerceAtLeast(160f).dp)
            .clip(RoundedCornerShape(22.dp)).background(Panel).border(1.dp, Color(0xff394440), RoundedCornerShape(22.dp))) {
            Row(Modifier.fillMaxWidth().padding(start = 22.dp, end = 14.dp, top = 12.dp, bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Setup", Modifier.weight(1f), fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                Box(Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)).clickable(role = Role.Button) { session.showSetup(false) }
                    .semantics { contentDescription = "Close setup" }, contentAlignment = Alignment.Center) { Text("×", color = Muted, fontSize = 28.sp) }
            }
            HorizontalDivider(color = Color(0xff303b36))
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()).padding(20.dp)) {
                Text("Players", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf(2, 4).forEach { count ->
                        val selected = session.board.preferences.count == count
                        Column(Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(if (selected) Color(0xff252e23) else Color(0xff141b1b))
                            .border(1.dp, if (selected) Lime else Color(0xff3a4640), RoundedCornerShape(12.dp))
                            .testTag("count-$count").clickable(role = Role.Button) { session.setCount(count) }
                            .semantics { this.selected = selected }.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Row(Modifier.height(28.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                repeat(count / 2) {
                                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                                        repeat(2) { Box(Modifier.size(12.dp).clip(RoundedCornerShape(3.dp)).background(if (selected) Lime else Muted)) }
                                    }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            Text("$count players", fontSize = 14.sp, color = if (selected) Lime else Muted)
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
                Text("Allow energy above 10", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text("Enable for decks that can hold extra energy.", Modifier.padding(top = 6.dp, bottom = 14.dp), fontSize = 12.sp, color = Muted)
                Column(Modifier.clip(RoundedCornerShape(12.dp)).background(Color(0xff151d1c)).border(1.dp, Color(0xff344039), RoundedCornerShape(12.dp))) {
                    repeat(session.board.preferences.count) { id ->
                        if (id > 0) HorizontalDivider(color = Color(0xff2c3731))
                        val player = session.board.player(id)
                        Row(Modifier.fillMaxWidth().testTag("limit-$id").toggleable(player.preference.allowAbove10,
                            enabled = player.energy <= 10, role = Role.Switch,
                            onValueChange = { session.setLimit(id, it) })
                            .semantics { contentDescription = "Allow energy above 10 for ${player.preference.name}" }
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(Modifier.size(10.dp).clip(CircleShape).background(playerColor(player.preference.color)))
                            Column(Modifier.weight(1f)) {
                                Text(player.preference.name, fontSize = 14.sp)
                                if (player.energy > 10) Text("Lower energy to 10 before switching off.", Modifier.padding(top = 5.dp), fontSize = 11.sp, color = Muted)
                            }
                            Switch(checked = player.preference.allowAbove10, onCheckedChange = null, enabled = player.energy <= 10,
                                modifier = Modifier.clearAndSetSemantics {})
                        }
                    }
                }
            }
            HorizontalDivider(color = Color(0xff303b36))
            Button({ session.showSetup(false) }, Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp).heightIn(min = 48.dp).testTag("done"),
                shape = RoundedCornerShape(10.dp)) { Text("Done", color = Color(0xff1a270d)) }
        }
    }
}
